# 🚀 Deployment Checklist

## Pre-deployment
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] .env configured with production values
- [ ] Database credentials ready
- [ ] Domain/subdomain configured

## cPanel Setup
- [ ] MySQL database created
- [ ] Database user created with privileges
- [ ] Node.js app created (v18+)
- [ ] SSL certificate installed
- [ ] Subdomain `api.yourdomain.com` created

## Backend Deployment
- [ ] backend-deploy.zip uploaded
- [ ] Files extracted to app root
- [ ] .env file created with correct values
- [ ] Dependencies installed: `npm install --production`
- [ ] Prisma generated: `npx prisma generate`
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] PM2 installed and app started
- [ ] API accessible at https://api.yourdomain.com

## Frontend Deployment
- [ ] frontend-deploy.zip uploaded
- [ ] Files extracted to public_html
- [ ] .htaccess configured
- [ ] API endpoint URL correct
- [ ] Site accessible at https://yourdomain.com

## Testing
- [ ] Backend health check: `curl https://api.yourdomain.com/api/v1/health`
- [ ] Login works
- [ ] Create order works
- [ ] Payment flow works
- [ ] SePay webhook configured
- [ ] Admin panel accessible

## Post-deployment
- [ ] Change default admin password
- [ ] Test all critical features
- [ ] Monitor logs for errors
- [ ] Setup backup schedule
- [ ] Document any issues

## Notes
- Backend logs: `pm2 logs mlm-api`
- Restart backend: `pm2 restart mlm-api`
- Frontend at: /home/username/public_html
- Backend at: /home/username/api
