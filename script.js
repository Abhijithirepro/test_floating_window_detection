class AIElementDetector {
    constructor() {
        this.isDetecting = false;
        this.detectedElements = new Set();
        this.observer = null;
        this.stats = {
            total: 0,
            aiInterfaces: 0,
            aiSidebars: 0,
            aiUtilities: 0
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupMutationObserver();
        console.log('🤖 AI Element Detector initialized');
    }

    bindEvents() {
        document.getElementById('startDetection').addEventListener('click', () => this.startDetection());
        document.getElementById('stopDetection').addEventListener('click', () => this.stopDetection());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
    }

    setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
            if (!this.isDetecting) return;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.analyzeElement(node);
                            this.analyzeChildElements(node);
                        }
                    });
                }

                // Check attribute changes that might indicate AI element injection
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || 
                     mutation.attributeName === 'id' || 
                     mutation.attributeName.startsWith('data-'))) {
                    this.analyzeElement(mutation.target);
                }
            });
        });
    }

    isAIRelatedElement(element, computedStyle) {
        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        const attributes = Array.from(element.attributes).map(attr => `${attr.name}=${attr.value}`).join(' ').toLowerCase();
        
        // AI-specific identifiers
        const aiIdentifiers = {
            products: [
                'aitopia', 'chatgpt', 'claude', 'anthropic', 'copilot', 'openai',
                'bard', 'gemini', 'mistral', 'perplexity', 'cohere'
            ],
            features: [
                'assistant', 'ai-chat', 'bot', 'completion', 'suggestion',
                'prompt', 'response', 'message-list', 'conversation'
            ],
            frameworks: [
                'data-v-app', // Vue.js root
                'ng-version', // Angular
                'data-react', // React
                '_next',      // Next.js
                'nuxt'       // Nuxt.js
            ],
            containers: [
                'chat-container',
                'message-container',
                'conversation-container',
                'ai-interface',
                'assistant-container'
            ]
        };

        // Check for AI product names
        const hasAIProduct = aiIdentifiers.products.some(product => 
            className.includes(product) || 
            id.includes(product) || 
            attributes.includes(product)
        );

        // Check for AI feature indicators
        const hasAIFeature = aiIdentifiers.features.some(feature => 
            className.includes(feature) || 
            id.includes(feature) || 
            attributes.includes(feature)
        );

        // Check for framework-specific patterns often used by AI tools
        const hasFrameworkPattern = aiIdentifiers.frameworks.some(framework => 
            attributes.includes(framework)
        );

        // Check for typical AI interface containers
        const hasAIContainer = aiIdentifiers.containers.some(container => 
            className.includes(container) || 
            id.includes(container)
        );

        // Check for textarea or input elements that might be prompt inputs
        const isPromptInput = (
            element.tagName === 'TEXTAREA' || 
            (element.tagName === 'INPUT' && element.type === 'text')
        ) && (
            className.includes('prompt') || 
            className.includes('chat') || 
            className.includes('message') ||
            id.includes('prompt') || 
            id.includes('chat') || 
            id.includes('message')
        );

        // Check for specific styling patterns common in AI interfaces
        const hasAIStyling = (
            computedStyle.position === 'fixed' &&
            (parseInt(computedStyle.zIndex) > 1000 || computedStyle.zIndex === '-1') &&
            (
                element.querySelector('.message-list') ||
                element.querySelector('[class*="chat"]') ||
                element.querySelector('[class*="prompt"]') ||
                element.querySelector('textarea')
            )
        );

        // Determine the type of AI element for statistics
        if (hasAIProduct || hasAIFeature || hasAIContainer) {
            if (className.includes('sidebar') || id.includes('sidebar')) {
                element.setAttribute('data-ai-type', 'sidebar');
                this.stats.aiSidebars++;
            } else if (isPromptInput || element.querySelector('textarea')) {
                element.setAttribute('data-ai-type', 'interface');
                this.stats.aiInterfaces++;
            } else {
                element.setAttribute('data-ai-type', 'utility');
                this.stats.aiUtilities++;
            }
        }

        return {
            isAI: hasAIProduct || hasAIFeature || hasAIContainer || hasAIStyling || isPromptInput,
            reasons: [
                hasAIProduct && 'AI Product Identifier',
                hasAIFeature && 'AI Feature Pattern',
                hasFrameworkPattern && 'Framework Pattern',
                hasAIContainer && 'AI Container Structure',
                hasAIStyling && 'AI Interface Styling',
                isPromptInput && 'Prompt Input Element'
            ].filter(Boolean)
        };
    }

    analyzeElement(element) {
        if (!element || element === document.body || element === document.documentElement) return;
        if (this.detectedElements.has(element)) return;

        const computedStyle = window.getComputedStyle(element);
        const aiAnalysis = this.isAIRelatedElement(element, computedStyle);
        
        if (aiAnalysis.isAI) {
            this.detectedElements.add(element);
            this.addToResults(element, computedStyle, aiAnalysis.reasons);
            this.stats.total++;
            this.updateStats();
            
            console.log('🤖 Detected AI element:', {
                element,
                tagName: element.tagName,
                classes: element.className,
                type: element.getAttribute('data-ai-type'),
                reasons: aiAnalysis.reasons
            });
        }
    }

    addToResults(element, computedStyle, reasons) {
        const resultsContainer = document.getElementById('detectedElements');
        const noResults = resultsContainer.querySelector('.no-results');
        if (noResults) noResults.remove();

        const elementDiv = document.createElement('div');
        elementDiv.className = 'detected-element';
        
        const type = element.getAttribute('data-ai-type') || 'unknown';
        const tagName = element.tagName.toLowerCase();
        const elementId = element.id ? `#${element.id}` : '';
        const elementClasses = element.className ? `.${element.className.split(' ').join('.')}` : '';
        
        elementDiv.innerHTML = `
            <div class="element-info">
                <div class="element-tag">
                    <span class="ai-type-badge ${type}">${type}</span>
                    ${tagName}${elementId}${elementClasses}
                </div>
                <div class="element-properties">
                    <div class="property">
                        <div class="property-label">Detection Reasons:</div>
                        <div class="property-value">${reasons.join(', ')}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Position:</div>
                        <div class="property-value">${computedStyle.position}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Z-Index:</div>
                        <div class="property-value">${computedStyle.zIndex}</div>
                    </div>
                </div>
            </div>
        `;

        elementDiv.addEventListener('click', () => this.highlightElement(element));
        resultsContainer.appendChild(elementDiv);
        this.updateElementCount();
    }

    updateStats() {
        document.getElementById('totalDetected').textContent = this.stats.total;
        document.getElementById('aiInterfaces').textContent = this.stats.aiInterfaces;
        document.getElementById('aiSidebars').textContent = this.stats.aiSidebars;
        document.getElementById('aiUtilities').textContent = this.stats.aiUtilities;
    }

    startDetection() {
        this.isDetecting = true;
        
        // Start observing DOM changes
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Scan existing elements
        this.scanExistingElements();

        this.updateUI();
        console.log('🚀 Detection started');
    }

    stopDetection() {
        this.isDetecting = false;
        this.observer.disconnect();
        this.updateUI();
        console.log('⏹️ Detection stopped');
    }

    scanExistingElements() {
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            if (element !== document.body && element !== document.documentElement) {
                this.analyzeElement(element);
            }
        });
    }

    analyzeChildElements(parentElement) {
        const children = parentElement.querySelectorAll('*');
        children.forEach(child => this.analyzeElement(child));
    }

    highlightElement(element) {
        // Remove previous highlights
        document.querySelectorAll('.highlighted-element').forEach(el => {
            el.classList.remove('highlighted-element');
        });

        // Add highlight style
        element.classList.add('highlighted-element');
        
        // Add temporary highlight style if it doesn't exist
        if (!document.getElementById('highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'highlight-styles';
            style.textContent = `
                .highlighted-element {
                    outline: 3px solid #ff6b6b !important;
                    outline-offset: 2px !important;
                    animation: pulse-highlight 2s ease-in-out;
                }
                @keyframes pulse-highlight {
                    0%, 100% { outline-color: #ff6b6b; }
                    50% { outline-color: #ff9999; }
                }
            `;
            document.head.appendChild(style);
        }

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after 3 seconds
        setTimeout(() => {
            element.classList.remove('highlighted-element');
        }, 3000);
    }

    updateElementCount() {
        document.getElementById('elementCount').textContent = `(${this.detectedElements.size})`;
    }

    clearResults() {
        this.detectedElements.clear();
        this.stats = { total: 0, aiInterfaces: 0, aiSidebars: 0, aiUtilities: 0 };
        
        const resultsContainer = document.getElementById('detectedElements');
        resultsContainer.innerHTML = '<p class="no-results">No AI elements detected yet. Click "Start Detection" to begin monitoring.</p>';
        
        this.updateElementCount();
        this.updateStats();
        
        // Remove any highlights
        document.querySelectorAll('.highlighted-element').forEach(el => {
            el.classList.remove('highlighted-element');
        });
        
        console.log('🧹 Results cleared');
    }

    updateUI() {
        const startBtn = document.getElementById('startDetection');
        const stopBtn = document.getElementById('stopDetection');
        
        if (this.isDetecting) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.textContent = 'DETECTING...';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            startBtn.textContent = 'START DETECTION';
        }
    }
}

// Initialize the detector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiDetector = new AIElementDetector();
});

// Also provide manual initialization if needed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.aiDetector) {
            window.aiDetector = new AIElementDetector();
        }
    });
} else {
    window.aiDetector = new AIElementDetector();
} 
