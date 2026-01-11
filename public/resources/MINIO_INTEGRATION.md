# MinIO Integration Guide

This document explains how to switch from local file storage to MinIO (S3-compatible object storage) for profile picture uploads.

## Why MinIO?

- **Scalability**: Better for production environments with multiple server instances
- **CDN Integration**: Easier to integrate with CDN for faster image delivery
- **Separation of Concerns**: Decouples file storage from application server
- **S3 Compatible**: Works with AWS S3, DigitalOcean Spaces, and other S3-compatible services

## Current Implementation

The application currently uses **local file storage** (files saved to `public/uploads/avatars/`). The code includes commented MinIO implementation that you can enable.

## Prerequisites

1. **Install MinIO** (choose one):
   ```bash
   # Option 1: Docker (recommended for development)
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     quay.io/minio/minio server /data --console-address ":9001"

   # Option 2: Download binary from https://min.io/download
   ```

2. **Install MinIO client package**:
   ```bash
   npm install minio
   ```

## Configuration Steps

### 1. Environment Variables

Add these to your `.env` file:

```env
# Storage Configuration
STORAGE_TYPE=minio          # Set to 'minio' to enable MinIO, 'local' for file system

# MinIO Configuration
MINIO_ENDPOINT=localhost    # MinIO server hostname
MINIO_PORT=9000            # MinIO server port
MINIO_ACCESS_KEY=minioadmin  # MinIO access key
MINIO_SECRET_KEY=minioadmin  # MinIO secret key
MINIO_BUCKET=avatars       # Bucket name for avatars
MINIO_USE_SSL=false        # Set to 'true' for HTTPS

# For production with AWS S3:
# MINIO_ENDPOINT=s3.amazonaws.com
# MINIO_PORT=443
# MINIO_ACCESS_KEY=your-aws-access-key
# MINIO_SECRET_KEY=your-aws-secret-key
# MINIO_BUCKET=your-bucket-name
# MINIO_USE_SSL=true
```

### 2. Uncomment MinIO Code in server.js

**Location 1: MinIO Client Setup (around line 20)**
```javascript
// Uncomment these lines:
const Minio = require('minio');
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'avatars';

// Bucket initialization
(async () => {
    try {
        const exists = await minioClient.bucketExists(MINIO_BUCKET);
        if (!exists) {
            await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
            const policy = {
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
                }]
            };
            await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
            console.log(`✅ MinIO bucket '${MINIO_BUCKET}' created and configured`);
        } else {
            console.log(`✅ MinIO bucket '${MINIO_BUCKET}' exists`);
        }
    } catch (err) {
        console.error('❌ MinIO bucket setup error:', err);
    }
})();
```

**Location 2: Multer Storage Configuration (around line 107)**
```javascript
// Comment out the diskStorage and uncomment:
const storage = multer.memoryStorage();
```

**Location 3: Upload Handler (around line 185)**
```javascript
// Uncomment the entire MinIO upload block in the if (STORAGE_TYPE === 'minio') section
```

### 3. Update Frontend (Optional)

If using MinIO with presigned URLs, the frontend will receive temporary URLs. You may want to refresh these URLs periodically:

```javascript
// In tempUserProfile.js or wherever avatars are displayed
// MinIO presigned URLs expire after 7 days by default
// You might want to add logic to refresh them
```

## Storage Type Comparison

| Feature | Local File System | MinIO |
|---------|------------------|-------|
| Setup Complexity | Simple | Moderate |
| Scalability | Limited | High |
| Multi-server Support | Requires shared storage | Built-in |
| CDN Integration | Manual | Easy |
| Backup | File system backup | Built-in replication |
| Performance | Fast (local) | Network latency |
| Cost | Disk space | Storage service cost |

## Testing MinIO Integration

1. **Start MinIO** (if using Docker):
   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     quay.io/minio/minio server /data --console-address ":9001"
   ```

2. **Access MinIO Console**: http://localhost:9001
   - Username: `minioadmin`
   - Password: `minioadmin`

3. **Update .env**:
   ```env
   STORAGE_TYPE=minio
   ```

4. **Restart your Node.js server**

5. **Upload a profile picture** - Check the MinIO console to see the file

## Troubleshooting

### Bucket Not Found Error
```javascript
// Ensure bucket exists in MinIO console or check bucket creation code
```

### Connection Refused
- Verify MinIO is running: `docker ps` or check the service
- Check `MINIO_ENDPOINT` and `MINIO_PORT` in `.env`

### Access Denied
- Verify `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`
- Check bucket policy allows public read access

### Presigned URL Expires
- Adjust expiry time in the code: `presignedGetObject(MINIO_BUCKET, fileName, seconds)`
- Consider implementing a URL refresh mechanism

## Switching Back to Local Storage

Simply set in `.env`:
```env
STORAGE_TYPE=local
```

The code will automatically use local file system storage.

## Production Deployment

### Using AWS S3
```env
STORAGE_TYPE=minio
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_ACCESS_KEY=your-aws-access-key
MINIO_SECRET_KEY=your-aws-secret-key
MINIO_BUCKET=your-bucket-name
MINIO_USE_SSL=true
```

### Using DigitalOcean Spaces
```env
STORAGE_TYPE=minio
MINIO_ENDPOINT=nyc3.digitaloceanspaces.com
MINIO_PORT=443
MINIO_ACCESS_KEY=your-spaces-key
MINIO_SECRET_KEY=your-spaces-secret
MINIO_BUCKET=your-space-name
MINIO_USE_SSL=true
```

## Code Maintenance

The MinIO code is **commented out** by default to keep the application simple for development. When merging or deploying:

1. Review `server.js` comments marked with `// ============`
2. Uncomment the sections based on your storage choice
3. Test thoroughly in a staging environment
4. Update documentation if making changes

## Database Schema

Both storage types use the same database field:
- **Local**: `/uploads/avatars/filename.jpg`
- **MinIO**: `minio://filename.jpg` (presigned URLs returned to frontend)

This allows switching between storage types without data migration.
