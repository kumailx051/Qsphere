# QSphere position decision email templates

These templates are ready to paste into EmailJS.

Files:

- `position-application-accepted.html`
- `position-application-rejected.html`

If you want to use only one EmailJS template for both outcomes, use:

- `position-application-accepted.html`

and treat it as a shared decision template with conditionals.

Recommended EmailJS template variables:

- `{{name}}` — applicant full name
- `{{position_title}}` — job / position title
- `{{company_name}}` — your brand name, for example `QSphere`
- `{{website_link}}` — public site URL
- `{{support_email}}` — contact email for questions
- `{{sender_name}}` — admin / hiring manager name
- `{{logo_url}}` — optional hosted logo URL

Acceptance template also uses:

- `{{interview_date}}` — interview date
- `{{interview_location}}` — interview location or meeting link
- `{{interview_time}}` — optional interview time
- `{{next_step_note}}` — optional short note, for example `Please arrive 10 minutes early.`
- `{{is_accepted}}` — set `true` for accepted, `false` for rejected

Rejection template also uses:

- `{{encouragement_note}}` — optional note, for example `We encourage you to apply again in the future.`

For a single shared EmailJS template:

- accepted email:
  - `is_accepted: true`
- rejected email:
  - `is_accepted: false`

Notes:

- If you do not want a hosted logo, replace the `<img ... />` block with plain text `QSphere`.
- These templates are styled to feel like your site: clean white surface, emerald accents, soft borders, rounded cards.
- Once you share the EmailJS template IDs, I can wire the accept/reject buttons in `ManagePositionsPage.jsx` and hook them into the backend send flow.
