# Contributing

1. Create a focused branch from `main`.
2. Add or update a failing test before changing behavior.
3. Run the frontend and Rust verification commands documented in the README.
4. Keep user data local and avoid runtime network dependencies.
5. Open a pull request describing the user-visible change and verification.

New themes must use semantic tokens, support reduced motion and keyboard focus, and must not own timer or persistence logic.
