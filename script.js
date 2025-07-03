class FloatingElementDetector {
    constructor() {
        this.isDetecting = false;
        this.detectedElements = new Set();
        this.observer = null;
        this.stats = {
            total: 0,
            fixed: 0,
            absolute: 0,
            highZIndex: 0
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupMutationObserver();
        console.log('🔍 Floating Element Detector initialized');
    }

    bindEvents() {
        document.getElementById('startDetection').addEventListener('click', () => this.startDetection());
        document.getElementById('stopDetection').addEventListener('click', () => this.stopDetection());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
        document.getElementById('simulateFloating').addEventListener('click', () => this.simulateFloatingElements());
    }

    setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
            if (!this.isDetecting) return;

            mutations.forEach((mutation) => {
                // Check for added nodes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.analyzeElement(node);
                        // Also check children of added nodes
                        this.analyzeChildElements(node);
                    }
                });

                // Check for attribute changes that might affect positioning
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || 
                     mutation.attributeName === 'class')) {
                    this.analyzeElement(mutation.target);
                }
            });
        });
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

    analyzeElement(element) {
        if (!element || element === document.body || element === document.documentElement) return;
        if (this.detectedElements.has(element)) return;

        const computedStyle = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        const isFloating = this.isFloatingElement(element, computedStyle, rect);
        
        if (isFloating) {
            this.detectedElements.add(element);
            this.addToResults(element, computedStyle, rect);
            this.updateStats(computedStyle);
            
            console.log('🎯 Detected floating element:', {
                element,
                tagName: element.tagName,
                classes: element.className,
                position: computedStyle.position,
                zIndex: computedStyle.zIndex
            });
        }
    }

    isFloatingElement(element, computedStyle, rect) {
        const checks = {
            detectPosition: document.getElementById('detectPosition').checked,
            detectHighZIndex: document.getElementById('detectHighZIndex').checked,
            detectOverflow: document.getElementById('detectOverflow').checked
        };

        // Skip our own detector interface
        if (element.closest('header') || element.closest('main') || element.closest('footer')) {
            return false;
        }

        let isFloating = false;
        const reasons = [];

        // Check positioning
        if (checks.detectPosition) {
            const position = computedStyle.position;
            if (position === 'fixed' || position === 'absolute' || position === 'sticky') {
                isFloating = true;
                reasons.push(`Position: ${position}`);
            }
        }

        // Check z-index
        if (checks.detectHighZIndex) {
            const zIndex = parseInt(computedStyle.zIndex);
            if (!isNaN(zIndex) && zIndex > 100) {
                isFloating = true;
                reasons.push(`High z-index: ${zIndex}`);
            }
        }

        // Check if element is outside normal document flow
        if (checks.detectOverflow) {
            const { top, left, right, bottom } = rect;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Check if element is partially outside viewport but still visible
            if ((left < 0 && right > 0) || 
                (top < 0 && bottom > 0) || 
                (right > viewportWidth && left < viewportWidth) ||
                (bottom > viewportHeight && top < viewportHeight)) {
                
                // Only consider it floating if it's also positioned
                if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
                    isFloating = true;
                    reasons.push('Partially outside viewport');
                }
            }
        }

        // Additional heuristics for common floating elements
        if (this.hasFloatingCharacteristics(element, computedStyle)) {
            isFloating = true;
            reasons.push('Common floating element characteristics');
        }

        if (isFloating && reasons.length > 0) {
            element.setAttribute('data-floating-reasons', reasons.join(', '));
        }

        return isFloating;
    }

    hasFloatingCharacteristics(element, computedStyle) {
        // Check for common floating element patterns
        const className = element.className.toLowerCase();
        const id = element.id.toLowerCase();
        
        // Common floating element keywords
        const floatingKeywords = [
            'float', 'overlay', 'modal', 'popup', 'tooltip', 'dropdown',
            'sidebar', 'drawer', 'panel', 'widget', 'chat', 'notification',
            'banner', 'sticky', 'fixed', 'floating', 'fab', 'action-button'
        ];

        const hasFloatingKeyword = floatingKeywords.some(keyword => 
            className.includes(keyword) || id.includes(keyword)
        );

        // Check for high z-index combined with positioning
        const zIndex = parseInt(computedStyle.zIndex);
        const hasHighZIndex = !isNaN(zIndex) && zIndex > 50;
        const isPositioned = ['fixed', 'absolute', 'sticky'].includes(computedStyle.position);

        // Check for elements that are likely injected by third-party scripts
        const isLikelyInjected = !element.closest('[data-app]') && 
                                !element.closest('[id*="app"]') &&
                                !element.closest('[class*="app"]');

        return hasFloatingKeyword || (hasHighZIndex && isPositioned) || 
               (isPositioned && isLikelyInjected && element.children.length > 0);
    }

    addToResults(element, computedStyle, rect) {
        const resultsContainer = document.getElementById('detectedElements');
        
        // Remove "no results" message if it exists
        const noResults = resultsContainer.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }

        const elementDiv = document.createElement('div');
        elementDiv.className = 'detected-element';
        
        const tagName = element.tagName.toLowerCase();
        const elementId = element.id ? `#${element.id}` : '';
        const elementClasses = element.className ? `.${element.className.split(' ').join('.')}` : '';
        
        elementDiv.innerHTML = `
            <div class="element-info">
                <div class="element-tag">${tagName}${elementId}${elementClasses}</div>
                <div class="element-properties">
                    <div class="property">
                        <div class="property-label">Position:</div>
                        <div class="property-value">${computedStyle.position}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Z-Index:</div>
                        <div class="property-value">${computedStyle.zIndex}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Display:</div>
                        <div class="property-value">${computedStyle.display}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Dimensions:</div>
                        <div class="property-value">${Math.round(rect.width)}×${Math.round(rect.height)}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Location:</div>
                        <div class="property-value">top: ${Math.round(rect.top)}, left: ${Math.round(rect.left)}</div>
                    </div>
                    <div class="property">
                        <div class="property-label">Detection Reasons:</div>
                        <div class="property-value">${element.getAttribute('data-floating-reasons') || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;

        // Add click handler to highlight element
        elementDiv.addEventListener('click', () => this.highlightElement(element));
        
        resultsContainer.appendChild(elementDiv);
        this.updateElementCount();
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

    updateStats(computedStyle) {
        this.stats.total++;
        
        if (computedStyle.position === 'fixed') {
            this.stats.fixed++;
        } else if (computedStyle.position === 'absolute') {
            this.stats.absolute++;
        }
        
        const zIndex = parseInt(computedStyle.zIndex);
        if (!isNaN(zIndex) && zIndex > 100) {
            this.stats.highZIndex++;
        }

        // Update UI
        document.getElementById('totalDetected').textContent = this.stats.total;
        document.getElementById('fixedElements').textContent = this.stats.fixed;
        document.getElementById('absoluteElements').textContent = this.stats.absolute;
        document.getElementById('highZIndexElements').textContent = this.stats.highZIndex;
    }

    updateElementCount() {
        document.getElementById('elementCount').textContent = `(${this.detectedElements.size})`;
    }

    clearResults() {
        this.detectedElements.clear();
        this.stats = { total: 0, fixed: 0, absolute: 0, highZIndex: 0 };
        
        const resultsContainer = document.getElementById('detectedElements');
        resultsContainer.innerHTML = '<p class="no-results">No floating elements detected yet. Click "Start Detection" to begin monitoring.</p>';
        
        this.updateElementCount();
        this.updateStats({});
        
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

    simulateFloatingElements() {
        console.log('🎭 Simulating floating elements...');
        
        // Create a floating chat icon
        setTimeout(() => {
            const chatIcon = document.createElement('div');
            chatIcon.className = 'simulated-floating';
            chatIcon.innerHTML = '💬';
            chatIcon.style.bottom = '20px';
            chatIcon.style.right = '20px';
            chatIcon.setAttribute('data-simulated', 'true');
            document.body.appendChild(chatIcon);
            
            chatIcon.addEventListener('click', () => {
                const sidebar = document.querySelector('.simulated-sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('show');
                }
            });
            
            console.log('📱 Added simulated chat icon');
        }, 500);

        // Create a sliding sidebar
        setTimeout(() => {
            const sidebar = document.createElement('div');
            sidebar.className = 'simulated-sidebar';
            sidebar.innerHTML = `
                <button class="close-btn">×</button>
                <h3>Simulated Sidebar</h3>
                <p>This is a simulated floating sidebar that would typically be injected by a third-party script.</p>
                <ul>
                    <li>Customer Support</li>
                    <li>Live Chat</li>
                    <li>Help Center</li>
                    <li>Contact Us</li>
                </ul>
            `;
            sidebar.setAttribute('data-simulated', 'true');
            document.body.appendChild(sidebar);
            
            sidebar.querySelector('.close-btn').addEventListener('click', () => {
                sidebar.classList.remove('show');
            });
            
            console.log('📋 Added simulated sidebar');
        }, 1000);

        // Create a notification banner
        setTimeout(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(45deg, #ff9800, #f57c00);
                color: white;
                padding: 1rem;
                text-align: center;
                z-index: 9997;
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                transform: translateY(-100%);
                transition: transform 0.3s ease;
            `;
            banner.innerHTML = `
                🔔 Simulated notification banner - This would typically contain promotions or alerts
                <button style="background: none; border: 1px solid white; color: white; margin-left: 1rem; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Dismiss</button>
            `;
            banner.setAttribute('data-simulated', 'true');
            document.body.appendChild(banner);
            
            // Animate in
            setTimeout(() => {
                banner.style.transform = 'translateY(0)';
            }, 100);
            
            banner.querySelector('button').addEventListener('click', () => {
                banner.style.transform = 'translateY(-100%)';
                setTimeout(() => banner.remove(), 300);
            });
            
            console.log('📢 Added simulated notification banner');
        }, 1500);

        console.log('✨ Simulated elements will appear over the next 2 seconds');
    }
}

// Initialize the detector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.floatingDetector = new FloatingElementDetector();
});

// Also provide manual initialization if needed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.floatingDetector) {
            window.floatingDetector = new FloatingElementDetector();
        }
    });
} else {
    window.floatingDetector = new FloatingElementDetector();
} 