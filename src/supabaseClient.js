import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvwytgmldfwmdhlnfttz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2d3l0Z21sZGZ3bWRobG5mdHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjU4MjksImV4cCI6MjA4ODM0MTgyOX0.M_Sul9b-Q60vHzNd2vRqsfgx7VPk59WzwIzzpRi2bL8'

// Evento que se emite cuando falla una escritura (insert/update/delete/upsert
// o subida de archivo). App.jsx lo escucha y muestra un aviso, así ningún
// guardado falla en silencio aunque el código que lo llamó no revise `error`.
export const WRITE_ERROR_EVENT = 'supabase-write-error'

const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE']

export function isWriteRequest(url, method) {
  const m = (method || 'GET').toUpperCase()
  return WRITE_METHODS.includes(m) && /\/(rest|storage)\/v1\//.test(url)
}

async function describeFailure(response) {
  try {
    const body = await response.clone().json()
    return body?.message || body?.error || `Error ${response.status}`
  } catch {
    return `Error ${response.status}`
  }
}

function notifyWriteError(message) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(WRITE_ERROR_EVENT, { detail: { message } }))
}

export async function fetchWithWriteErrors(input, init) {
  const url = typeof input === 'string' ? input : input?.url || String(input)
  const method = init?.method || input?.method
  if (!isWriteRequest(url, method)) return fetch(input, init)
  let response
  try {
    response = await fetch(input, init)
  } catch (err) {
    notifyWriteError('Sin conexión con el servidor')
    throw err
  }
  if (!response.ok) notifyWriteError(await describeFailure(response))
  return response
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithWriteErrors },
})

// Supabase no lanza excepciones: devuelve { data, error }. `must` convierte el
// error en excepción, para cortar un flujo de varios pasos en el primer fallo
// (y que los try/catch que lo rodean realmente se activen).
export async function must(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

// Reemplaza todas las filas hijas de un registro (líneas de cotización, tareas
// de Gantt, líneas de OC) por `rows`. Antes se borraba todo y se reinsertaba:
// si la inserción fallaba, el registro quedaba sin líneas. Ahora se respaldan
// las filas actuales y, si la inserción falla, se restauran antes de lanzar
// el error.
export async function replaceRows(client, table, column, value, rows) {
  const previous = await must(client.from(table).select('*').eq(column, value))
  await must(client.from(table).delete().eq(column, value))
  if (rows.length === 0) return
  const { error } = await client.from(table).insert(rows)
  if (!error) return
  if (previous.length > 0) {
    // Se intenta conservar los ids originales (otras filas pueden apuntar a
    // ellos); si la tabla no acepta ids explícitos, se restauran sin id.
    const { error: restoreError } = await client.from(table).insert(previous)
    if (restoreError) {
      await client.from(table).insert(previous.map(r => {
        const copy = { ...r }
        delete copy.id
        return copy
      }))
    }
  }
  throw error
}
