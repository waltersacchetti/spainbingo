/**
 * Script de Prueba del Chat - BingoRoyal
 * Para verificar que el sistema de chat funcione correctamente
 */

class ChatTester {
    constructor() {
        this.testResults = [];
        this.currentTest = 0;
        console.log('🧪 ChatTester inicializado');
    }
    
    /**
     * Ejecutar todas las pruebas
     */
    async runAllTests() {
        console.log('🚀 Iniciando pruebas del chat...');
        
        this.testResults = [];
        this.currentTest = 0;
        
        // Prueba 1: Verificar configuración
        await this.testConfiguration();
        
        // Prueba 2: Verificar elementos del DOM
        await this.testDOMElements();
        
        // Prueba 3: Verificar conectividad de la API
        await this.testApiConnectivity();
        
        // Prueba 4: Verificar funcionalidad del chat
        await this.testChatFunctionality();
        
        // Mostrar resultados
        this.showResults();
    }
    
    /**
     * Probar configuración del chat
     */
    async testConfiguration() {
        this.currentTest++;
        console.log(`📋 Prueba ${this.currentTest}: Verificando configuración...`);
        
        try {
            if (!window.chatConfig) {
                throw new Error('ChatConfig no está disponible');
            }
            
            const config = window.chatConfig.getSystemStatus();
            console.log('✅ Configuración del chat:', config);
            
            this.testResults.push({
                test: this.currentTest,
                name: 'Configuración del Chat',
                status: 'PASÓ',
                details: 'ChatConfig inicializado correctamente'
            });
            
        } catch (error) {
            console.error('❌ Error en configuración:', error);
            this.testResults.push({
                test: this.currentTest,
                name: 'Configuración del Chat',
                status: 'FALLÓ',
                details: error.message
            });
        }
    }
    
    /**
     * Probar elementos del DOM
     */
    async testDOMElements() {
        this.currentTest++;
        console.log(`📋 Prueba ${this.currentTest}: Verificando elementos del DOM...`);
        
        try {
            const elements = {
                'Botón del Chat': document.querySelector('.chat-toggle-btn-fixed'),
                'Sección del Chat': document.getElementById('chatSectionFixed'),
                'Input del Chat': document.getElementById('chatInput'),
                'Botón Enviar': document.querySelector('.btn-send')
            };
            
            let allFound = true;
            const foundElements = [];
            
            Object.entries(elements).forEach(([name, element]) => {
                if (element) {
                    foundElements.push(name);
                } else {
                    allFound = false;
                }
            });
            
            if (allFound) {
                this.testResults.push({
                    test: this.currentTest,
                    name: 'Elementos del DOM',
                    status: 'PASÓ',
                    details: `Todos los elementos encontrados: ${foundElements.join(', ')}`
                });
            } else {
                throw new Error(`Elementos faltantes: ${Object.keys(elements).filter(key => !elements[key]).join(', ')}`);
            }
            
        } catch (error) {
            console.error('❌ Error en elementos del DOM:', error);
            this.testResults.push({
                test: this.currentTest,
                name: 'Elementos del DOM',
                status: 'FALLÓ',
                details: error.message
            });
        }
    }
    
    /**
     * Probar conectividad de la API
     */
    async testApiConnectivity() {
        this.currentTest++;
        console.log(`📋 Prueba ${this.currentTest}: Verificando conectividad de la API...`);
        
        try {
            if (!window.chatConfig) {
                throw new Error('ChatConfig no disponible para probar API');
            }
            
            const connectivity = await window.chatConfig.checkApiConnectivity();
            console.log('✅ Conectividad de la API:', connectivity);
            
            if (connectivity.connected) {
                this.testResults.push({
                    test: this.currentTest,
                    name: 'Conectividad de la API',
                    status: 'PASÓ',
                    details: `API conectada (Status: ${connectivity.status})`
                });
            } else {
                throw new Error(`API no conectada: ${connectivity.error}`);
            }
            
        } catch (error) {
            console.error('❌ Error en conectividad de la API:', error);
            this.testResults.push({
                test: this.currentTest,
                name: 'Conectividad de la API',
                status: 'FALLÓ',
                details: error.message
            });
        }
    }
    
    /**
     * Probar funcionalidad del chat
     */
    async testChatFunctionality() {
        this.currentTest++;
        console.log(`📋 Prueba ${this.currentTest}: Verificando funcionalidad del chat...`);
        
        try {
            // Verificar si el juego está inicializado
            if (!window.bingoGame) {
                throw new Error('BingoGame no está inicializado');
            }
            
            // Verificar si el chat está inicializado
            if (!window.bingoGame.chatInitialized) {
                throw new Error('Chat no está inicializado en BingoGame');
            }
            
            // Verificar funciones del chat
            const requiredFunctions = [
                'initializeLiveChat',
                'sendChatMessage',
                'loadChatMessages',
                'startChatPolling'
            ];
            
            const missingFunctions = requiredFunctions.filter(func => 
                typeof window.bingoGame[func] !== 'function'
            );
            
            if (missingFunctions.length > 0) {
                throw new Error(`Funciones faltantes: ${missingFunctions.join(', ')}`);
            }
            
            this.testResults.push({
                test: this.currentTest,
                name: 'Funcionalidad del Chat',
                status: 'PASÓ',
                details: 'Todas las funciones del chat están disponibles'
            });
            
        } catch (error) {
            console.error('❌ Error en funcionalidad del chat:', error);
            this.testResults.push({
                test: this.currentTest,
                name: 'Funcionalidad del Chat',
                status: 'FALLÓ',
                details: error.message
            });
        }
    }
    
    /**
     * Mostrar resultados de las pruebas
     */
    showResults() {
        console.log('\n📊 RESULTADOS DE LAS PRUEBAS:');
        console.log('==============================');
        
        const passed = this.testResults.filter(r => r.status === 'PASÓ').length;
        const failed = this.testResults.filter(r => r.status === 'FALLÓ').length;
        const total = this.testResults.length;
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASÓ' ? '✅' : '❌';
            console.log(`${icon} ${result.name}: ${result.status}`);
            console.log(`   ${result.details}`);
        });
        
        console.log('\n📈 RESUMEN:');
        console.log(`   Total: ${total}`);
        console.log(`   Pasaron: ${passed}`);
        console.log(`   Fallaron: ${failed}`);
        console.log(`   Porcentaje de éxito: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed === 0) {
            console.log('🎉 ¡Todas las pruebas pasaron! El chat está funcionando correctamente.');
        } else {
            console.log('⚠️ Algunas pruebas fallaron. Revisa los errores arriba.');
        }
    }
    
    /**
     * Probar envío de mensaje
     */
    async testMessageSending() {
        console.log('📤 Probando envío de mensaje...');
        
        try {
            if (!window.bingoGame || !window.bingoGame.sendChatMessage) {
                throw new Error('Función sendChatMessage no disponible');
            }
            
            const testMessage = 'Mensaje de prueba ' + Date.now();
            const result = await window.bingoGame.sendChatMessage(testMessage);
            
            console.log('✅ Mensaje enviado:', result);
            return true;
            
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            return false;
        }
    }
    
    /**
     * Probar carga de mensajes
     */
    async testMessageLoading() {
        console.log('📥 Probando carga de mensajes...');
        
        try {
            if (!window.bingoGame || !window.bingoGame.loadChatMessages) {
                throw new Error('Función loadChatMessages no disponible');
            }
            
            const result = await window.bingoGame.loadChatMessages();
            
            console.log('✅ Mensajes cargados:', result);
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando mensajes:', error);
            return false;
        }
    }
}

// Crear instancia global
window.chatTester = new ChatTester();

// Función global para ejecutar pruebas
window.runChatTests = () => window.chatTester.runAllTests();

// Función global para probar envío de mensaje
window.testChatMessage = () => window.chatTester.testMessageSending();

// Función global para probar carga de mensajes
window.testChatLoading = () => window.chatTester.testMessageLoading();

console.log('🧪 ChatTester cargado. Usa runChatTests() para ejecutar todas las pruebas.');
