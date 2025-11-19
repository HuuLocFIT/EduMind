#!/bin/bash

# ============================================
# Generate Per-Service Encryption Keys
# ============================================
# This script generates unique encryption keys
# for each microservice in the EduMind platform
#
# Usage: ./generate-all-service-keys.sh
# ============================================

echo "🔐 Generating Per-Service Encryption Keys for EduMind..."
echo ""

# Generate unique 32-byte (256-bit) keys for each service
AUTH_KEY=$(openssl rand -base64 32)

echo "✅ Keys Generated Successfully!"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 COPY TO YOUR .env FILE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "# ============================================"
echo "# ENCRYPTION KEYS - PER SERVICE"
echo "# Generated: $(date)"
echo "# ============================================"
echo ""
echo "# Auth Service - Encrypts: 2FA secrets, OAuth tokens"
echo "AUTH_SERVICE_ENCRYPTION_KEY=$AUTH_KEY"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "⚠️  CRITICAL SECURITY WARNINGS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. 🔒 Keep these keys SECRET - Never share or commit to Git"
echo "2. 🚫 Add .env to .gitignore immediately"
echo "3. 🔑 Use DIFFERENT keys for dev/staging/production"
echo "4. 🏢 Store production keys in AWS Secrets Manager or Vault"
echo "5. 🔄 Rotate keys quarterly (every 3 months)"
echo "6. 📝 Document key rotation procedures"
echo "7. 👥 Limit access - Only DevOps team should see production keys"
echo "8. 📊 Enable audit logging for key access"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📝 NEXT STEPS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. Create .env file:"
echo "   $ touch .env"
echo ""
echo "2. Copy the keys above into .env"
echo ""
echo "3. Verify .env is in .gitignore:"
echo "   $ grep -q '.env' .gitignore || echo '.env' >> .gitignore"
echo ""
echo "4. Test locally:"
echo "   $ docker-compose up -d"
echo ""
echo "5. For production, store in AWS Secrets Manager:"
echo "   $ aws secretsmanager create-secret \\"
echo "       --name edumind/auth-service/encryption-key \\"
echo "       --secret-string \"<AUTH_KEY>\""
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Done! Keys are ready to use."
echo ""