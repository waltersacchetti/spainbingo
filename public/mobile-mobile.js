/* ===== JAVASCRIPT MÓVIL SIMPLE Y ESTABLE ===== */

let mobileMenuOpen = false;

// Función simple para detectar móvil
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Función para toggle del menú
function toggleMobileMenu() {
    if (mobileMenuOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// Abrir menú móvil
function openMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const button = document.getElementById('mobileMenuToggle');
    
    if (menu && overlay && button) {
        menu.classList.add('active');
        overlay.classList.add('active');
        button.innerHTML = '<i class="fas fa-times"></i>';
        document.body.style.overflow = 'hidden';
        mobileMenuOpen = true;
    }
}

// Cerrar menú móvil
function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const button = document.getElementById('mobileMenuToggle');
    
    if (menu && overlay && button) {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        button.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.style.overflow = '';
        mobileMenuOpen = false;
    }
}

// Configuración simple cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Solo en móvil
    if (isMobileDevice()) {
        const button = document.getElementById('mobileMenuToggle');
        const overlay = document.getElementById('mobileMenuOverlay');
        
        if (button) {
            button.style.display = 'block';
            button.addEventListener('click', toggleMobileMenu);
        }
        
        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }
        
        // Cerrar con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && mobileMenuOpen) {
                closeMobileMenu();
            }
        });
    }
});

// Responsive
window.addEventListener('resize', function() {
    const button = document.getElementById('mobileMenuToggle');
    if (button) {
        if (isMobileDevice()) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
            closeMobileMenu();
        }
    }
});

// Exportar funciones globales
window.toggleMobileMenu = toggleMobileMenu;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu; 