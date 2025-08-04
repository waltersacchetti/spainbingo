#!/bin/bash

# Script para sincronizar archivos principales con la carpeta public
# Uso: ./sync-public.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Archivos que deben sincronizarse
FILES_TO_SYNC=(
    "index.html"
    "styles.css"
    "script.js"
    "auth.js"
    "security.js"
    "welcome.html"
    "welcome-styles.css"
    "welcome-script.js"
    "login.html"
    "entrada.html"
    "privacy-policy.html"
    "terms.html"
)

# Verificar que la carpeta public existe
check_public_folder() {
    if [ ! -d "public" ]; then
        show_error "La carpeta 'public' no existe"
        show_info "Creando carpeta public..."
        mkdir -p public
    fi
}

# Sincronizar archivos
sync_files() {
    show_info "Sincronizando archivos con la carpeta public..."
    
    local synced_count=0
    local skipped_count=0
    
    for file in "${FILES_TO_SYNC[@]}"; do
        if [ -f "$file" ]; then
            if [ "$file" -nt "public/$file" ] || [ ! -f "public/$file" ]; then
                cp "$file" "public/"
                show_success "Sincronizado: $file"
                ((synced_count++))
            else
                show_info "Sin cambios: $file"
                ((skipped_count++))
            fi
        else
            show_warning "Archivo no encontrado: $file"
        fi
    done
    
    show_success "Sincronización completada: $synced_count archivos actualizados, $skipped_count sin cambios"
}

# Verificar diferencias
check_differences() {
    show_info "Verificando diferencias entre archivos principales y public..."
    
    local has_differences=false
    
    for file in "${FILES_TO_SYNC[@]}"; do
        if [ -f "$file" ] && [ -f "public/$file" ]; then
            if ! diff -q "$file" "public/$file" >/dev/null 2>&1; then
                show_warning "Diferencias encontradas en: $file"
                has_differences=true
            fi
        fi
    done
    
    if [ "$has_differences" = false ]; then
        show_success "Todos los archivos están sincronizados"
    fi
}

# Mostrar estado de sincronización
show_status() {
    show_info "Estado de sincronización:"
    echo ""
    
    for file in "${FILES_TO_SYNC[@]}"; do
        if [ -f "$file" ]; then
            if [ -f "public/$file" ]; then
                if [ "$file" -nt "public/$file" ]; then
                    echo -e "  ${YELLOW}⚠️  $file (desactualizado)${NC}"
                else
                    echo -e "  ${GREEN}✅ $file (sincronizado)${NC}"
                fi
            else
                echo -e "  ${RED}❌ $file (faltante en public)${NC}"
            fi
        else
            echo -e "  ${RED}❌ $file (no existe)${NC}"
        fi
    done
}

# Función principal
main() {
    case "${1:-sync}" in
        "sync")
            check_public_folder
            sync_files
            ;;
        "check")
            check_differences
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo "Uso: ./sync-public.sh [OPCIÓN]"
            echo ""
            echo "Opciones:"
            echo "  sync    - Sincronizar archivos con public (por defecto)"
            echo "  check   - Verificar diferencias"
            echo "  status  - Mostrar estado de sincronización"
            echo "  help    - Mostrar esta ayuda"
            echo ""
            echo "Archivos que se sincronizan:"
            for file in "${FILES_TO_SYNC[@]}"; do
                echo "  - $file"
            done
            ;;
    esac
}

# Ejecutar función principal
main "$@" 