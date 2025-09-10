# RoyalRaptorPOS - Serverless Deployment Guide

This guide will help you deploy your RoyalRaptorPOS application to AWS Lambda using the Serverless Framework.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure AWS CLI
3. **Node.js**: Version 18 or higher
4. **Serverless Framework**: Install globally with `npm install -g serverless`

## Setup Instructions

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# MongoDB Connection (use MongoDB Atlas for production)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/royalraptorpos

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration (comma-separated URLs)
CLIENT_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AWS Configuration
AWS_REGION=us-east-1
```

### 3. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 4. Deploy to AWS Lambda

#### Option A: Using the deployment script
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual deployment
```bash
cd server
npm run deploy
```

### 5. Update Client Configuration

After deployment, you'll get an API Gateway URL. Update your client configuration:

```bash
# Create a .env file in the client directory
cd client
echo "VITE_API_URL=https://your-api-gateway-url.amazonaws.com/dev" > .env
```

## Development

### Local Development with Serverless Offline

```bash
cd server
npm run offline
```

This will start your API locally on port 3000, simulating AWS Lambda.

### Regular Local Development

```bash
# Start the server
cd server
npm run dev

# Start the client (in another terminal)
cd client
npm run dev
```

## Production Deployment

### 1. Deploy to Production Stage

```bash
cd server
npm run deploy:prod
```

### 2. Build and Deploy Client

```bash
cd client
npm run build
```

Deploy the `dist` folder to your hosting provider (Netlify, Vercel, AWS S3, etc.).

## Environment Variables

### Server Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/royalraptorpos` |
| `JWT_SECRET` | Secret key for JWT tokens | `royalraptor_dev_secret_change_me` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `CLIENT_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |

### Client Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API Gateway URL for production | `http://localhost:5050` (dev) |

## AWS Services Used

- **AWS Lambda**: Serverless compute
- **API Gateway**: HTTP API endpoints
- **CloudWatch**: Logging and monitoring
- **IAM**: Permissions and roles

## Cost Optimization

- The free tier includes 1M requests per month
- Consider using AWS Lambda Provisioned Concurrency for consistent performance
- Monitor CloudWatch metrics to optimize memory and timeout settings

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CLIENT_ORIGINS` includes your frontend domain
2. **Database Connection**: Use MongoDB Atlas for production (local MongoDB won't work with Lambda)
3. **Cold Starts**: Consider using Provisioned Concurrency for better performance
4. **Timeout Issues**: Increase timeout in `serverless.yml` if needed

### Useful Commands

```bash
# View logs
serverless logs -f api

# Remove deployment
npm run remove

# Deploy to specific stage
serverless deploy --stage prod

# Test locally
npm run offline
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **JWT Secret**: Use a strong, unique secret for production
3. **CORS**: Restrict origins to your actual domains
4. **Database**: Use MongoDB Atlas with proper authentication
5. **AWS Permissions**: Follow the principle of least privilege

## Monitoring

- Use CloudWatch for monitoring Lambda performance
- Set up alarms for errors and high latency
- Monitor API Gateway metrics
- Use AWS X-Ray for distributed tracing (optional)

## Support

For issues related to:
- **Serverless Framework**: Check the [official documentation](https://www.serverless.com/)
- **AWS Lambda**: Check [AWS Lambda documentation](https://docs.aws.amazon.com/lambda/)
- **MongoDB Atlas**: Check [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/)
