-- Add branch_id column to users table
ALTER TABLE users ADD COLUMN branch_id VARCHAR(50);

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id);

-- Optional: Update existing agents to assign branches (replace with actual branch IDs)
-- UPDATE users SET branch_id = 'BRANCH001' WHERE role = 'agent' AND branch_id IS NULL;
-- UPDATE users SET branch_id = 'BRANCH002' WHERE role = 'agent' AND user_id = 'AGENT002' AND branch_id IS NULL;




-- kigalibranchagent@gmail.com ✓ Compiled /api/users in 2.7s (792 modules)
Error creating user: NeonDbError: null value in column "user_id" of relation "users" violates not-null constraint
    at dr.execute (webpack-internal:///(rsc)/./node_modules/.pnpm/@neondatabase+serverless@1.0.1/node_modules/@neondatabase/serverless/index.mjs:1316:10)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async eval (webpack-internal:///(rsc)/./app/api/users/route.ts:102:24)
    at async D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:55831
    at async eO.execute (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:46527)
    at async eO.handle (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:57165)
    at async doRender (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:1352:42)       
    at async cacheEntry.responseCache.get.routeKind (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:1574:28)
    at async DevServer.renderToResponseWithComponentsImpl (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:1482:28)
    at async DevServer.renderPageComponent (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:1908:24)
    at async DevServer.renderToResponseImpl (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:1946:32)
    at async DevServer.pipeImpl (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:921:25)
    at async NextNodeServer.handleCatchallRenderRequest (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\next-server.js:272:17)
    at async DevServer.handleRequestImpl (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\base-server.js:817:17)
    at async D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\dev\next-dev-server.js:339:20
    at async Span.traceAsyncFn (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\trace\trace.js:154:20)      
    at async DevServer.handleRequest (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\dev\next-dev-server.js:336:24)
    at async invokeRender (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\lib\router-server.js:173:21)
    at async handleRequest (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\lib\router-server.js:350:24)
    at async requestHandlerImpl (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\lib\router-server.js:374:13)
    at async Server.requestListener (D:\TRACK\v0-final-year-project\node_modules\.pnpm\next@14.2.16_@opentelemetry_da75d851a892308e0cd1b0fe043677db\node_modules\next\dist\server\lib\start-server.js:141:13) {
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (5, null, kigalibranchagent@gmail.com, $2b$12$E2O6YqBghFrMNZdOSs71pOc0MLo5xGUqw1IeSOXoGzAZAXTyQ9fxu, Fred Ndabikunze, +250788945986, agent, t, 2025-10-10 18:32:47.554719, 2025-10-10 18:32:47.554719, BR001).',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'users',
  column: 'user_id',
  dataType: undefined,
  constraint: undefined,
  file: 'execMain.c',
  line: '1997',
  routine: 'ExecConstraints',
  sourceError: undefined
}
 POST /api/users 500 in 8862ms
