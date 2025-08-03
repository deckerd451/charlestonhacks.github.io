// routingService.js

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

// — your Supabase service-role key must go in env vars —
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/** 
 * POST /signals
 * body: { type: string, payload: object, created_by: uuid }
 */
app.post('/signals', async (req, res) => {
  const { type, payload, created_by } = req.body
  const { data, error } = await supabase
    .from('signals')
    .insert([{ type, payload, created_by }])
    .select('id')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ signal_id: data.id })
})

/** 
 * GET /signals
 * optional query: ?limit=10&offset=0
 */
app.get('/signals', async (req, res) => {
  const limit  = parseInt(req.query.limit  || '50', 10)
  const offset = parseInt(req.query.offset || '0', 10)

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

/** 
 * POST /feedback
 * body: { signal_id: uuid, from_neuron_id: uuid, to_neuron_id: uuid, endorsement: boolean, comment?: string }
 */
app.post('/feedback', async (req, res) => {
  const { signal_id, from_neuron_id, to_neuron_id, endorsement, comment } = req.body
  const { data, error } = await supabase
    .from('feedback')
    .insert([{ signal_id, from_neuron_id, to_neuron_id, endorsement, comment }])
    .select('id')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ feedback_id: data.id })
})

/** 
 * GET /feedback
 * required query: ?signal_id=<uuid>
 */
app.get('/feedback', async (req, res) => {
  const { signal_id } = req.query
  if (!signal_id) return res.status(400).json({ error: 'signal_id is required' })

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('signal_id', signal_id)
    .order('created_at', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`🚀 Routing service listening on port ${PORT}`)
})
