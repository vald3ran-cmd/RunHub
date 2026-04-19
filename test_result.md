#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "App di running con programmi personalizzati, 4-tier subscription Stripe, GPS tracking, AI Coach, auth JWT, onboarding, badge, TTS audio coach. Attualmente l'utente ha richiesto la possibilita' di eliminare account utenti in modalita' admin."

backend:
  - task: "Admin panel endpoints (GET/DELETE /api/admin/users)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Endpoints esistenti ma il seed admin non era idempotente: il campo role='admin' non veniva impostato sugli admin gia' esistenti in DB. Conseguenza: GET /api/admin/users restituiva 403."
      - working: true
        agent: "main"
        comment: "Aggiornato startup seed per impostare role='admin' se mancante. Verificato via curl: login admin OK, GET /api/admin/users -> 200 con 9 utenti, DELETE su admin -> 400, DELETE su utente normale -> 200."
      - working: true
        agent: "testing"
        comment: "Eseguiti 12/12 test automatici via /app/backend_test.py contro https://run-training-hub-1.preview.emergentagent.com/api. PASS: (1) POST /api/auth/login admin@runhub.com/admin123 -> 200, token + user.role='admin' + tier='elite'. (2) GET /api/auth/me con Bearer token -> role='admin'. (3) GET /api/admin/users -> 200, array di 10 utenti, tutti i campi richiesti (user_id, email, name, workout_count) presenti, nessuno con password_hash esposto. (4) GET /api/admin/users senza token -> 401 'Not authenticated'. (5) GET /api/admin/users con token utente normale (appena registrato) -> 403 'Accesso admin richiesto'. (6) DELETE /api/admin/users/{admin_uid} con token admin -> 400 'Impossibile eliminare un admin'. (7a) Registrato delete_me_<ts>@test.com e DELETE con token admin -> 200 con payload {ok:true, deleted_user_id, email}. (7b) L'utente eliminato non appare piu' in GET /admin/users (cascade conferma). (8) DELETE /api/admin/users/user_doesnotexist_xyz123 -> 404 'Utente non trovato'. (9) DELETE con token non-admin -> 403. Regression: POST /api/auth/register OK; GET /api/plans con token admin OK (9 piani predefiniti). Minor (non blocking): 3 utenti legacy nel DB (test_*@runhub.com, test1@runhub.com) non hanno il campo 'tier' persistito (probabilmente creati prima dell'introduzione del campo). Non impatta la funzionalita' admin ma potrebbe essere normalizzato con una migration."
    needs_retesting: false

frontend:
  - task: "Admin panel UI with delete users"
    implemented: true
    working: "NA"
    file: "frontend/app/admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Pagina /admin gia' implementata, pulsante visibile in Profile solo per role='admin'. Non richiede re-test fino a richiesta utente."

  - task: "Social community UI (Feed, Friends, Leaderboard, Comments)"
    implemented: true
    working: "NA"
    file: "frontend/app/social.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Creata pagina /social con tab segmentati: Feed (post amici+self, like, commenti modal), Amici (lista + richieste in/out + cerca utenti + aggiungi), Classifica (filtri weekly/monthly/all e km/runs/calories). Link da Home (CTA) e Profile (row). Registrata nel Stack root. Richiede test frontend su richiesta utente."

  - task: "Real AdMob integration (react-native-google-mobile-ads) with graceful fallback"
    implemented: true
    working: "NA"
    file: "frontend/src/adMobReal.native.tsx, frontend/src/adMobReal.web.tsx, frontend/src/Ads.tsx, frontend/app.json"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Integrato react-native-google-mobile-ads 16.3.2 + expo-tracking-transparency. Config plugin in app.json con iosAppId/androidAppId RunHub (ca-app-pub-8711276203998030~...). Bundle identifier impostato com.runhub.app. SKAdNetworkItems, NSUserTrackingUsageDescription e permission android AD_ID aggiunti. File platform-specific: adMobReal.native.tsx (real BannerAd + InterstitialManager singleton con preload) e adMobReal.web.tsx (stub). In __DEV__ usa TestIds Google, in prod le vere unit ID: Banner iOS 2143901506, Banner Android 9061723134, Interstitial iOS 8309854604, Interstitial Android 2638725524. AdBanner mostra real banner su native build, fallback a UpsellBanner in Expo Go/web. Post-run: real AdMob interstitial per utenti Free su native build, fallback a modal placeholder altrimenti. Richiede EAS build per vedere ads vere."

backend:
  - task: "Social feed endpoints (friends, feed, likes, comments, leaderboard)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Aggiunti 12 endpoints sotto /api/social/*: POST /friends/request (email), POST /friends/respond/{id}?action=accept|reject, DELETE /friends/{user_id}, GET /friends, GET /friends/requests, GET /friends/outgoing, GET /users/search?q=, GET /feed, POST/DELETE /workouts/{id}/like, GET/POST /workouts/{id}/comments, DELETE /comments/{id}, GET /leaderboard?period=&metric=. Smoke test via curl: feed, users/search, leaderboard = 200 OK."
      - working: true
        agent: "testing"
        comment: "Eseguiti 42/42 test automatici via /app/backend_test.py contro https://run-training-hub-1.preview.emergentagent.com/api. TUTTI PASS. (1) Setup: login admin + register/login alice_<ts>@test.com e bob_<ts>@test.com. (2) Friend happy path: POST /social/friends/request (email=bob) -> 200 con ok/friendship_id/target.user_id. GET /social/friends/requests per bob -> 1 incoming con from.user_id=alice. GET /social/friends/outgoing per alice -> 1 outgoing con to.user_id=bob. POST /social/friends/respond/{id}?action=accept con token alice (self) -> 400 'Non puoi rispondere a una tua richiesta'. POST stesso endpoint con token bob -> 200 status=accepted. GET /social/friends per entrambi -> lista contiene l'altro con total_km + total_runs. (3) Edge cases: self request -> 400 'Non puoi inviare una richiesta a te stesso'; already friends -> 400 \"Siete gia' amici\"; email inesistente -> 404 'Utente non trovato'. (4) Search: /social/users/search?q=bob -> bob presente con relation='friend'; ?q=a -> [] (singolo carattere); admin cerca alice -> relation='none'. (5) Feed: POST /api/workouts/complete come alice (workout_id=wk_b1, plan_id=pl_beginner_5k, title='Test Run', dur=600, km=2.0, pace=5.0, cal=150) -> 200 con session_id ws_*. GET /social/feed come bob include la sessione di alice (user.user_id=alice_uid). GET /social/feed come admin NON include la sessione di alice (admin non amico). (6) Likes: POST /social/workouts/{sid}/like come bob -> 200 likes_count=1; GET /feed come bob mostra liked_by_me=true e likes_count=1; secondo like -> 200 already_liked=true (idempotente); admin (non amico) -> 403 'Non autorizzato'; DELETE like -> 200 likes_count=0. (7) Comments: POST /comments {text:'Bravo!'} -> 200 con comment_id cm_*; text vuoto -> 400 'Commento vuoto'; GET /comments include commento di bob con user_name='Bob Sprinter'; admin POST -> 403; DELETE comment_id come autore bob -> 200; alice (session owner) puo' eliminare commento di bob -> 200. (8) Leaderboard: /leaderboard?period=weekly&metric=km come alice -> 200, entries[] contiene alice con is_me=true; monthly&runs -> 200; period=invalid -> 400 'Periodo non valido'; metric=invalid -> 400 'Metrica non valida'. Nota minor: bob non compare nella leaderboard perche' non ha sessioni completate (comportamento corretto dell'aggregation - richiede almeno 1 sessione per apparire). (9) Unfriend: DELETE /social/friends/{bob_uid} come alice -> 200; GET /social/friends dopo unfriend -> []. (10) Regression: GET /admin/users come admin -> 200 con 14 utenti; GET /plans come alice -> 200. Cleanup: DELETE /admin/users/{alice_uid} e {bob_uid} come admin -> 200 entrambi. Social feed endpoints pienamente operativi, pronti per integrazione frontend."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Fixato bug seed admin. Gli endpoint /api/admin/users (GET e DELETE) ora funzionano. Richiesta verifica backend con credenziali admin@runhub.com / admin123. Testare: (1) login admin, (2) GET /api/admin/users, (3) DELETE protezione admin, (4) DELETE utente normale con cascata dati."
  - agent: "testing"
    message: "Completato il testing dei 9 casi P0 richiesti + 2 regression (12 asserzioni totali in /app/backend_test.py). Tutti i test passano contro l'URL pubblico. Login admin ritorna role='admin' + tier='elite'. GET /admin/users ritorna 200 con array di 10 utenti, nessun password_hash esposto. RBAC funziona: 401 senza token, 403 con utente normale. Protezione delete admin funziona (400 'Impossibile eliminare un admin'). Cascade delete su utente normale verificato (ok:true + payload completo + utente rimosso dalla lista). 404 per id inesistente. Regression OK: register e GET /plans funzionano con token admin. Nota minor (non blocking): 3 utenti legacy nel DB non hanno il campo 'tier' persistito - l'UserOut model lo default-a a 'free' ma il doc Mongo grezzo non lo contiene. Funzionalita' admin pienamente operativa."
  - agent: "testing"
    message: "Completato testing Social Feed: 42/42 assertions PASS in /app/backend_test.py. Coverage: friend request happy path (request/accept/list/incoming/outgoing), edge cases (self 400, already-friends 400, non-existent 404), user search (relation='friend'/'none'/single-char=empty), feed visibility (friend includes alice, non-friend admin excludes), likes (like/idempotent already_liked/unlike/403 non-friend), comments (add/empty=400/list with user_name/403 non-friend/delete by author/delete by session owner alice), leaderboard (weekly-km with is_me, monthly-runs, invalid period/metric -> 400), unfriend (DELETE -> lista vuota). Regression: /admin/users e /plans OK. Cleanup: alice e bob eliminati via DELETE /admin/users/{uid}. Nota: nel leaderboard weekly, bob non appare perche' non ha sessioni completate (aggregation $match+$group richiede almeno una sessione) - comportamento atteso e corretto. Tutti gli endpoint /api/social/* sono pronti per integrazione frontend."