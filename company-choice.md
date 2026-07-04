# Company choice  

Trackflow

# Reason chosen

I chose TrackFlow because it's a real logistics company full of manual processes — spreadsheets, WhatsApp alerts, paper picking lists — across every department. That gives me plenty of concrete, high-impact AI use cases to pick from, like automated customer support or return inspection. It also has clear, measurable pain points, making it easy to scope a project with obvious success criteria.

# Two departments

Customer Experience – interesting because it's a clean RAG problem: building a first-line AI agent that resolves tracking/return queries automatically, backed by a semantic knowledge base, with sentiment analysis to catch frustrated customers early.

Reverse Logistics – interesting because it combines rules-based automation (per-client approval logic) with computer vision (AI classifying product condition from photos), so it's not just one technique but a mix.

# One automation/AI challenge I'm most excited to build

The first-line Customer Experience agent — an AI agent that resolves tracking and return-status queries automatically instead of routing every single one to a human. It's a strong project choice because it's genuinely agentic (it has to interpret intent, pull data, and decide whether to answer or escalate), it's feasible to build and demo with simulated order/return data, and it targets one of the sharpest, most measurable pain points in the whole company: 80% of queries could be answered automatically, yet there's currently no knowledge base and zero coverage outside office hours.

# My AI Agent Idea

The First-Line Customer Experience Agent — an AI agent for Valentina Cruz's Customer Experience team that automatically resolves the most common customer queries instead of routing every single one to a human agent.

# What it would do

When a query comes in (via email, WhatsApp, or the tracking portal) from either a brand or an end consumer, the agent reads the query, determines what it's actually asking (where's my parcel, what's my return status, is this order still processing, a general question about the service), looks up the relevant data, and responds directly. If the query is too complex, ambiguous, or the customer seems frustrated, it escalates to a human agent with full context attached instead of making them start over.

# What information it would need

The incoming query text (email, WhatsApp message, or portal form)

Order and shipment status data (to answer "where's my parcel")

Return status data (to answer "what's happening with my return")

A semantic knowledge base of company policies and FAQs (for general questions), so the agent can retrieve relevant answers via RAG rather than guessing

Basic customer/order identifiers (order number, email, tracking number) to pull the right record

# What it would produce or trigger

A direct, accurate response for tracking/return/FAQ-type questions — no human needed

An escalation ticket with full context (query, what the agent already checked, why it couldn't resolve it) when the issue is too complex

A sentiment flag when a customer sounds frustrated or angry, so that ticket jumps the queue instead of waiting in line

Logged interaction data feeding the CX dashboard, giving Valentina visibility into query volume, resolution rate, and common complaint patterns for the first time