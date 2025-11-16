# Backend Setup

## Firebase Service Account

1. Go to [Firebase Console - Service Accounts](https://console.firebase.google.com/project/tetronix/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Download the JSON file
4. Copy `service-account.json.example` to `service-account.json`
5. Replace all placeholder values with your actual credentials from the downloaded file

**Never commit `service-account.json` to Git!** (already in .gitignore)

## Run Locally

```bash
# Start the API
cd api
npm run dev
```

The API will use `service-account.json` via `GOOGLE_APPLICATION_CREDENTIALS`.
