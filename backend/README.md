# GeekBid Backend Scaffold

Microservice scaffold aligned with the GeekBid plan.

## Services

- Auth Service: `:3001`
- Job Service: `:3003`
- Bidding Service (+ Socket.IO): `:3004`
- Payment Service: `:3005`
- Notification Service: `:3006`
- Chat Service (+ Socket.IO): `:3007`
- Gateway (service map endpoint): `:3000`

## Run

```bash
cd backend
npm install
npm start
```

## Notes

- In-memory demo store only.
- Endpoint shapes match mobile integration layer for rapid local iteration.
