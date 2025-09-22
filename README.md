This repo demonstrates the idea of a record/replay mode for [Playwright](https://playwright.dev/) e2e tests.

It contains a demo application with a backend and frontend. The idea is that you can run the e2e tests either in "record
mode" or "replay mode".

In "record mode" the tests are using the real backend. In this mode all requests will be recorded to the file system
(`./packages/frontend/src/e2e/api-mock`). In "replay mode", those recorded requests and responses will be used instead
of the real backend. Actually, the tests can be executed without the backend even running in "replay mode".

The whole idea is described in more detail in `./playwright-record-replay.md`.

## Start the demo app
(On windows make sure the correct line endings are used (LF, not CRLF) and run from wsl)

1. `yarn install`
2. in `./kanidm`
   - run `docker compose up -d` to start the auth provider [KaniDM](https://kanidm.com/)
   - run `./restore.sh` to import the test data (auth config, users, ...). This will stop the container.
   - run `docker compose up -d` again to start the container again
3. build backend, run `yarn build` in `./packages/backend`
4. in `./packages/backend`, run `yarn run dev` or `yarn run build & yarn run start` to start the backend
5. in `./packages/frontend`, run `yarn run dev` or `yarn run build & yarn run start` to start the frontend
6. Open your browser with `https://localhost:5173`. Notice: HTTPS is used to enable local OAuth. You will be warned by
   the browser because of an untrusted certificate. Press "accept the risk" or similar button depending on your browser.
7. run `yarn run test:e2e:record` to run the e2e tests in "record mode"
8. stop the backend
9. run `yarn run test:e2e:replay` to run the e2e tests in "replay mode"

You can also use the UI mode of playwright by running `test:e2e:record:ui` or `test:e2e:replay:ui`. However, in this
case, for record mode you will have to run `yarn run test:e2e:sanitize-hars` manually after all tests are finished.
