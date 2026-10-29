<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- The InkGuard demo (uploaded `inkguard.zip`) is served verbatim from `public/inkguard/index.html`; `/` redirects there. The only edit vs the upload is the API base URL, now same-origin (`/api`) instead of `http://localhost:8000` — the user's uploaded source must not be rewritten.
- `POST /api/check` (`src/routes/api/check.ts`) is a logic-identical TypeScript port of `backend/engine.py` from the upload; demo rules/facts live in `src/lib/inkguard-data.ts`. Do not rewire the page to an external localhost server — it is unreachable from the hosted preview.
- The original uploaded source is kept unmodified under `inkguard/` for reference. Its `backend/.env` contained a live Supabase service-role secret and was excluded; the user should rotate that key.
