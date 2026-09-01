# Base44 Development Notes

- The application is currently a static site served directly from the repository root.
- Start it with `docker compose -f docker-compose.base44.yml up -d`.
- The BrowserSync development server watches the bind-mounted source and serves it on port 3000.
- Verify locally with `curl -fsS http://localhost:3000/` and externally with `curl -fsS -H 'Host: external-preview.example.com' http://localhost:3000/`.
- No migrations, backing services, seeds, or external-service credentials are currently required.
