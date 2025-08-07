#!/bin/bash

echo "🔧 DIAGNÓSTICO Y REPARACIÓN DE CONEXIÓN SSH"
echo "============================================"

KEY_FILE="./spainbingo-key.pem"
SERVER_IP="52.212.178.26"

echo "📋 DIAGNÓSTICO:"
echo "==============="

# Verificar que la clave existe
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Error: No se encuentra la clave $KEY_FILE"
    exit 1
fi

echo "✅ Clave privada encontrada: $KEY_FILE"

# Verificar permisos
PERMS=$(stat -f "%Lp" "$KEY_FILE")
echo "📝 Permisos actuales: $PERMS"

if [ "$PERMS" != "600" ]; then
    echo "⚠️  Permisos incorrectos. Corrigiendo..."
    chmod 600 "$KEY_FILE"
    echo "✅ Permisos corregidos a 600"
else
    echo "✅ Permisos correctos (600)"
fi

# Generar clave pública
echo ""
echo "🔑 GENERANDO CLAVE PÚBLICA:"
echo "============================"

PUBLIC_KEY=$(ssh-keygen -y -f "$KEY_FILE")
echo "Clave pública generada:"
echo "$PUBLIC_KEY"

# Guardar clave pública en archivo
echo "$PUBLIC_KEY" > spainbingo-key.pub
echo "✅ Clave pública guardada en spainbingo-key.pub"

echo ""
echo "🔍 PROBANDO CONEXIÓN SSH:"
echo "========================="

# Probar conexión con verbosidad
echo "Intentando conexión SSH..."
ssh -v -i "$KEY_FILE" ec2-user@"$SERVER_IP" "echo 'Conexión exitosa'" 2>&1 | grep -E "(debug1: Trying private key|debug1: Authentications that can continue|Permission denied|Connection established)"

echo ""
echo "📋 POSIBLES SOLUCIONES:"
echo "======================="

echo "1. 🔑 AGREGAR CLAVE PÚBLICA AL SERVIDOR:"
echo "   La clave pública debe estar en: /home/ec2-user/.ssh/authorized_keys"
echo ""
echo "   Clave pública a agregar:"
echo "   $PUBLIC_KEY"
echo ""

echo "2. 🖥️  CONECTARSE VÍA AWS CONSOLE:"
echo "   - Ir a AWS Console > EC2 > Instancias"
echo "   - Seleccionar la instancia"
echo "   - Acciones > Conectar > Session Manager"
echo "   - Ejecutar: echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys"
echo ""

echo "3. 🔄 REINICIAR INSTANCIA:"
echo "   - AWS Console > EC2 > Instancias"
echo "   - Seleccionar instancia > Acciones > Estado de instancia > Reiniciar"
echo ""

echo "4. 🛠️  VERIFICAR CONFIGURACIÓN SSH:"
echo "   - Verificar que el usuario ec2-user existe"
echo "   - Verificar que .ssh/authorized_keys tiene permisos 600"
echo "   - Verificar que .ssh/ tiene permisos 700"
echo ""

echo "5. 📝 COMANDOS PARA EJECUTAR EN EL SERVIDOR (cuando tengas acceso):"
echo "   mkdir -p ~/.ssh"
echo "   chmod 700 ~/.ssh"
echo "   echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""

echo "🎯 RECOMENDACIÓN:"
echo "================="
echo "Usa AWS Session Manager para conectarte temporalmente y agregar la clave pública."
echo "Luego podrás usar SSH normalmente."

echo ""
echo "✅ Diagnóstico completado!" 