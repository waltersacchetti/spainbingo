#!/bin/bash

# Script para desplegar el Lambda del chat de SpainBingo
# Autor: SpainBingo Team

set -e

echo "🚀 Desplegando Lambda del Chat de SpainBingo..."

# Variables
LAMBDA_NAME="spainbingo-chat"
LAMBDA_ROLE="spainbingo-chat-role"
API_GATEWAY_NAME="spainbingo-chat-api"
DYNAMODB_TABLE="spainbingo-chat-messages"
REGION="eu-west-1"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que AWS CLI esté configurado
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI no está configurado. Por favor, ejecuta 'aws configure' primero."
    exit 1
fi

print_status "Verificando configuración de AWS..."

# 1. Crear tabla DynamoDB para mensajes del chat
print_status "Creando tabla DynamoDB para mensajes del chat..."

aws dynamodb create-table \
    --table-name $DYNAMODB_TABLE \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --endpoint-url http://dynamodb.$REGION.amazonaws.com || print_warning "La tabla ya existe"

print_success "Tabla DynamoDB creada/verificada: $DYNAMODB_TABLE"

# 2. Crear rol IAM para Lambda
print_status "Creando rol IAM para Lambda..."

# Crear trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear rol
aws iam create-role \
    --role-name $LAMBDA_ROLE \
    --assume-role-policy-document file://trust-policy.json \
    --region $REGION || print_warning "El rol ya existe"

# Adjuntar políticas necesarias
aws iam attach-role-policy \
    --role-name $LAMBDA_ROLE \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region $REGION || print_warning "Política básica ya adjunta"

# Crear política personalizada para DynamoDB
cat > dynamodb-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:$REGION:*:table/$DYNAMODB_TABLE"
    }
  ]
}
EOF

# Crear y adjuntar política de DynamoDB
aws iam put-role-policy \
    --role-name $LAMBDA_ROLE \
    --policy-name DynamoDBAccess \
    --policy-document file://dynamodb-policy.json \
    --region $REGION || print_warning "Política de DynamoDB ya existe"

print_success "Rol IAM creado/verificado: $LAMBDA_ROLE"

# 3. Preparar código Lambda
print_status "Preparando código Lambda..."

# Crear directorio temporal
mkdir -p temp-lambda
cp lambda/chat-handler.js temp-lambda/
cp lambda/package.json temp-lambda/

# Instalar dependencias
cd temp-lambda
npm install --production
cd ..

# Crear ZIP del código
cd temp-lambda
zip -r ../lambda-deployment.zip .
cd ..

print_success "Código Lambda preparado"

# 4. Obtener ARN del rol
ROLE_ARN=$(aws iam get-role --role-name $LAMBDA_ROLE --query 'Role.Arn' --output text --region $REGION)

# 5. Crear función Lambda
print_status "Creando función Lambda..."

aws lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler chat-handler.handler \
    --zip-file fileb://lambda-deployment.zip \
    --timeout 30 \
    --memory-size 256 \
    --region $REGION || print_warning "La función Lambda ya existe"

print_success "Función Lambda creada/verificada: $LAMBDA_NAME"

# 6. Crear API Gateway
print_status "Creando API Gateway..."

# Crear API
API_ID=$(aws apigateway create-rest-api \
    --name $API_GATEWAY_NAME \
    --description "API Gateway para chat de SpainBingo" \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-rest-apis \
    --region $REGION \
    --query "items[?name=='$API_GATEWAY_NAME'].id" \
    --output text)

print_success "API Gateway creado/verificado: $API_ID"

# Obtener root resource ID
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[?path==`/`].id' \
    --output text)

# Crear resource para chat
CHAT_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part "chat" \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/chat'].id" \
    --output text)

print_success "Resource de chat creado/verificado: $CHAT_RESOURCE_ID"

# 7. Crear métodos HTTP
print_status "Configurando métodos HTTP..."

# Método GET
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE \
    --region $REGION || print_warning "Método GET ya existe"

# Método POST
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION || print_warning "Método POST ya existe"

# Método OPTIONS (para CORS)
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION || print_warning "Método OPTIONS ya existe"

print_success "Métodos HTTP configurados"

# 8. Obtener ARN de la función Lambda
LAMBDA_ARN=$(aws lambda get-function \
    --function-name $LAMBDA_NAME \
    --region $REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

# 9. Configurar integración Lambda
print_status "Configurando integración Lambda..."

# Integración para GET y POST
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations \
    --region $REGION || print_warning "Integración GET ya existe"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations \
    --region $REGION || print_warning "Integración POST ya existe"

# Integración para OPTIONS (CORS)
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $CHAT_RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
    --region $REGION || print_warning "Integración OPTIONS ya existe"

print_success "Integración Lambda configurada"

# 10. Dar permisos a Lambda para ser invocado por API Gateway
print_status "Configurando permisos Lambda..."

aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:*:$API_ID/*/*/chat" \
    --region $REGION || print_warning "Permisos ya configurados"

print_success "Permisos Lambda configurados"

# 11. Desplegar API
print_status "Desplegando API Gateway..."

aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region $REGION || print_warning "Deployment ya existe"

print_success "API Gateway desplegado"

# 12. Obtener URL final
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod/chat"

print_success "✅ Chat Lambda desplegado exitosamente!"
echo ""
echo "📋 Información del despliegue:"
echo "   Lambda Function: $LAMBDA_NAME"
echo "   API Gateway: $API_GATEWAY_NAME"
echo "   DynamoDB Table: $DYNAMODB_TABLE"
echo "   API URL: $API_URL"
echo ""
echo "🔧 Para usar en el frontend, actualiza la URL del chat a:"
echo "   $API_URL"
echo ""

# Limpiar archivos temporales
rm -rf temp-lambda
rm -f lambda-deployment.zip
rm -f trust-policy.json
rm -f dynamodb-policy.json

print_success "🎉 ¡Despliegue completado!" 