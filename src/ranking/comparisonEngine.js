// Pairwise ("this or that") ranking engine.
//
// Songs live in sorted "runs" (best first). Work is a queue of tasks, and the
// question shown to the user always comes from the first task:
//   verify - double-check an album's own order, one neighboring pair at a time.
//            A flipped pair splits the album into separate runs at that point.
//   merge  - merge two runs into one by comparing their top songs.
//   insert - binary-search a single song into a run.
// Skipping moves the first task to the back of the queue. Every answer is
// remembered, so the same pair is never asked twice.
//
// Nothing here is saved directly. A session is { groups, events }: the starting
// runs plus a log of what the user did. State is rebuilt by replaying the log,
// which is also how undo works.

const pairKey = (x, y) => [String(x), String(y)].sort().join('|')
const sameId = (x, y) => String(x) === String(y)

export function createState(groups) {
  const state = { pool: [], tasks: [], known: new Map(), picks: 0 }
  for (const group of groups) {
    if (group.length > 1) {
      state.tasks.push({ type: 'verify', run: [group[0]], rest: group.slice(1) })
    } else if (group.length === 1) {
      state.pool.push([group[0]])
    }
  }
  settle(state)
  return state
}

export function replay(session) {
  const state = createState(session.groups)
  for (const event of session.events) {
    applyEvent(state, event)
  }
  return state
}

// Events: { t: 'pick', w: songId } | { t: 'skip' } | { t: 'add', ids } | { t: 'remove', ids }
export function applyEvent(state, event) {
  if (event.t === 'pick') {
    const task = state.tasks[0]
    if (!task) return
    const [x, y] = currentPair(task)
    if (!sameId(event.w, x) && !sameId(event.w, y)) return
    state.known.set(pairKey(x, y), event.w)
    state.picks++
  } else if (event.t === 'skip') {
    if (canSkip(state)) state.tasks.push(state.tasks.shift())
  } else if (event.t === 'add') {
    for (const id of event.ids) state.pool.push([id])
  } else if (event.t === 'remove') {
    removeSongs(state, event.ids)
  }
  settle(state)
}

export function getQuestion(state) {
  const task = state.tasks[0]
  if (!task) return null
  const [left, right] = currentPair(task)
  return { left, right, type: task.type }
}

export const canSkip = (state) => state.tasks.length > 1

export const isComplete = (state) => state.tasks.length === 0

export const finalRanking = (state) => (isComplete(state) ? state.pool[0] || [] : [])

// Upper-bound estimate of how many more picks are needed.
export function estimateRemaining(state) {
  let cost = 0
  const lengths = state.pool.map((run) => run.length)

  for (const task of state.tasks) {
    if (task.type === 'verify') {
      cost += task.rest.length
      lengths.push(task.run.length + task.rest.length)
    } else if (task.type === 'merge') {
      cost += task.a.length + task.b.length - 1
      lengths.push(task.out.length + task.a.length + task.b.length)
    } else {
      cost += Math.ceil(Math.log2(task.hi - task.lo + 1))
      lengths.push(task.list.length + 1)
    }
  }

  while (lengths.length > 1) {
    lengths.sort((a, b) => a - b)
    const [x, y] = lengths.splice(0, 2)
    cost += mergeCost(x, y)
    lengths.push(x + y)
  }
  return cost
}

// Best guess at the full order right now. Songs that haven't been compared
// against each other yet are placed by their relative position in their run.
export function provisionalRanking(state) {
  const groups = [...state.pool]
  for (const task of state.tasks) {
    if (task.type === 'verify') {
      groups.push([...task.run, ...task.rest])
    } else if (task.type === 'merge') {
      groups.push([...task.out, ...interleave(task.a, task.b)])
    } else {
      const list = [...task.list]
      list.splice(Math.floor((task.lo + task.hi) / 2), 0, task.id)
      groups.push(list)
    }
  }

  const scored = []
  for (const group of groups) {
    group.forEach((id, i) => {
      scored.push({ id, score: (i + 0.5) / group.length, size: group.length })
    })
  }
  scored.sort((p, q) => p.score - q.score || q.size - p.size)
  return scored.map((s) => s.id)
}

function mergeCost(x, y) {
  if (Math.min(x, y) === 1) return Math.ceil(Math.log2(Math.max(x, y) + 1))
  return x + y - 1
}

function interleave(a, b) {
  const scored = [
    ...a.map((id, i) => ({ id, score: (i + 0.5) / a.length })),
    ...b.map((id, i) => ({ id, score: (i + 0.5) / b.length })),
  ]
  return scored.sort((p, q) => p.score - q.score).map((s) => s.id)
}

function currentPair(task) {
  if (task.type === 'verify') return [task.run[task.run.length - 1], task.rest[0]]
  if (task.type === 'merge') return [task.a[0], task.b[0]]
  return [task.id, task.list[Math.floor((task.lo + task.hi) / 2)]]
}

function applyWinner(state, task, winner) {
  if (task.type === 'verify') {
    const [top, next] = currentPair(task)
    task.rest.shift()
    if (sameId(winner, top)) {
      task.run.push(next)
    } else {
      state.pool.push(task.run)
      task.run = [next]
    }
  } else if (task.type === 'merge') {
    const from = sameId(winner, task.a[0]) ? task.a : task.b
    task.out.push(from.shift())
  } else {
    const mid = Math.floor((task.lo + task.hi) / 2)
    if (sameId(winner, task.id)) task.hi = mid
    else task.lo = mid + 1
  }
}

function isFinished(task) {
  if (task.type === 'verify') return task.rest.length === 0
  if (task.type === 'merge') return task.a.length === 0 || task.b.length === 0
  return task.id == null || task.lo >= task.hi
}

function output(task) {
  if (task.type === 'verify') return task.run
  if (task.type === 'merge') return [...task.out, ...task.a, ...task.b]
  if (task.id == null) return task.list
  const list = [...task.list]
  list.splice(task.lo, 0, task.id)
  return list
}

// Answers anything already known, retires finished tasks, and pairs up idle
// runs (shortest first) into new tasks.
function settle(state) {
  let changed = true
  while (changed) {
    changed = false

    for (let i = 0; i < state.tasks.length; i++) {
      const task = state.tasks[i]
      while (!isFinished(task)) {
        const [x, y] = currentPair(task)
        const winner = state.known.get(pairKey(x, y))
        if (winner === undefined) break
        applyWinner(state, task, winner)
      }
      if (isFinished(task)) {
        const run = output(task)
        if (run.length) state.pool.push(run)
        state.tasks.splice(i, 1)
        i--
        changed = true
      }
    }

    while (state.pool.length >= 2) {
      state.pool.sort((a, b) => a.length - b.length)
      const [a, b] = state.pool.splice(0, 2)
      if (a.length === 1) {
        state.tasks.push({ type: 'insert', id: a[0], list: b, lo: 0, hi: b.length })
      } else {
        state.tasks.push({ type: 'merge', a, b, out: [] })
      }
      changed = true
    }
  }
}

function removeSongs(state, ids) {
  const gone = new Set(ids.map(String))
  const keep = (list) => list.filter((id) => !gone.has(String(id)))

  state.pool = state.pool.map(keep).filter((run) => run.length)
  for (const task of state.tasks) {
    if (task.type === 'verify') {
      task.run = keep(task.run)
      task.rest = keep(task.rest)
      if (!task.run.length && task.rest.length) task.run = [task.rest.shift()]
    } else if (task.type === 'merge') {
      task.a = keep(task.a)
      task.b = keep(task.b)
      task.out = keep(task.out)
    } else {
      if (gone.has(String(task.id))) task.id = null
      task.list = keep(task.list)
      // Restart the search; earlier answers are remembered and replay instantly.
      task.lo = 0
      task.hi = task.list.length
    }
  }
}
