# Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` (PowerShell):

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in `.env`:

   - Required to start: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
   - For product image uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

4. Start the development server:

   ```bash
   npm run dev
   ```
