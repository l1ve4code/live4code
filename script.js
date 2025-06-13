// Configuration
const CONFIG = {
    words: ['жить', 'чтобы', 'кодить', 'live4code'],
    typeSpeed: 120,
    deleteSpeed: 60,
    pauseAfterWord: 300,
    preVideoDelay: 800,
    pauseAfterSnap: 1000,
    finalPause: 1500,
    videoDuration: 4000 // 4 секунды для каждого видео
};

// Video management
class VideoManager {
    constructor() {
        this.videoOverlay = document.getElementById('video-overlay');
        this.hillVideo = document.getElementById('hill-video');
        this.lakeVideo = document.getElementById('lake-video');
        this.currentVideo = null;
        this.videoTimeout = null;
        this.init();
    }

    init() {
        // Убираем muted атрибут для включения звука
        this.hillVideo.muted = false;
        this.lakeVideo.muted = false;
        
        // Устанавливаем громкость
        this.hillVideo.volume = 0.7;
        this.lakeVideo.volume = 0.7;
        
        // Предзагружаем видео
        this.hillVideo.load();
        this.lakeVideo.load();
        
        // Добавляем обработчики событий
        [this.hillVideo, this.lakeVideo].forEach(video => {
            video.addEventListener('loadeddata', () => {
                console.log(`Видео ${video.id} загружено`);
            });
            
            video.addEventListener('error', (e) => {
                console.error(`Ошибка загрузки видео ${video.id}:`, e);
            });
            
            video.addEventListener('canplaythrough', () => {
                console.log(`Видео ${video.id} готово к воспроизведению`);
            });
        });
    }

    async playVideo(videoType) {
        return new Promise((resolve) => {
            const video = videoType === 'hill' ? this.hillVideo : this.lakeVideo;
            
            // Скрываем текущее видео если оно есть
            if (this.currentVideo) {
                this.currentVideo.classList.remove('playing');
                this.currentVideo.pause();
                this.currentVideo.currentTime = 0;
            }

            // Очищаем предыдущий таймаут
            if (this.videoTimeout) {
                clearTimeout(this.videoTimeout);
            }

            // Показываем overlay и новое видео
            this.videoOverlay.classList.add('active');
            video.classList.add('playing');
            this.currentVideo = video;

            // Запускаем видео
            video.currentTime = 0;
            
            // Включаем звук и воспроизводим
            video.muted = false;
            video.play().catch(error => {
                console.error('Ошибка воспроизведения видео:', error);
                this.hideVideo();
                resolve();
            });

            // Останавливаем видео через 4 секунды
            this.videoTimeout = setTimeout(() => {
                this.hideVideo();
                resolve();
            }, CONFIG.videoDuration);
        });
    }

    hideVideo() {
        if (this.currentVideo) {
            this.currentVideo.classList.remove('playing');
            this.currentVideo.pause();
            this.currentVideo.currentTime = 0;
        }
        
        this.videoOverlay.classList.remove('active');
        
        if (this.videoTimeout) {
            clearTimeout(this.videoTimeout);
            this.videoTimeout = null;
        }
        
        this.currentVideo = null;
    }
}

// Audio management
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = [];
        this.currentSoundIndex = 0;
        this.isAudioEnabled = false;
        this.fingerSnapSound = null;
        this.loadSounds();
    }

    async loadSounds() {
        try {
            // Загружаем звук finger-snap
            try {
                this.fingerSnapSound = new Audio('sounds/finger-snap.mp3');
                this.fingerSnapSound.preload = 'auto';
                this.fingerSnapSound.volume = 0.8;
                console.log('Звук finger-snap загружен');
            } catch (error) {
                console.log('Не удалось загрузить finger-snap.mp3');
            }

            // Пытаемся загрузить реальные звуки клавиатуры
            const soundFiles = ['sounds/press-1.mp3', 'sounds/press-2.mp3', 'sounds/press-3.mp3'];
            
            for (const file of soundFiles) {
                try {
                    const audio = new Audio(file);
                    audio.preload = 'auto';
                    audio.volume = 0.3;
                    this.sounds.push(audio);
                } catch (error) {
                    console.log(`Не удалось загрузить ${file}, будем использовать синтетические звуки`);
                }
            }

            // Если реальные звуки не загрузились, создаем синтетические
            if (this.sounds.length === 0) {
                await this.createSyntheticSounds();
            }

            this.isAudioEnabled = true;
        } catch (error) {
            console.log('Инициализация аудио не удалась:', error);
        }
    }

    async createSyntheticSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Создаем разные синтетические звуки клавиатуры
            const frequencies = [800, 900, 1000];
            
            for (const freq of frequencies) {
                const buffer = this.createKeyboardSound(freq);
                this.sounds.push(buffer);
            }
        } catch (error) {
            console.log('Создание синтетических звуков не удалось:', error);
        }
    }

    createKeyboardSound(frequency) {
        const duration = 0.1;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10);
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.1;
        }

        return buffer;
    }

    async playKeySound() {
        if (!this.isAudioEnabled || this.sounds.length === 0) return;

        try {
            const sound = this.sounds[this.currentSoundIndex];
            
            if (sound instanceof AudioBuffer) {
                // Синтетический звук
                const source = this.audioContext.createBufferSource();
                source.buffer = sound;
                source.connect(this.audioContext.destination);
                source.start();
            } else {
                // Реальный аудиофайл
                const audioClone = sound.cloneNode();
                audioClone.currentTime = 0;
                await audioClone.play();
            }

            this.currentSoundIndex = (this.currentSoundIndex + 1) % this.sounds.length;
        } catch (error) {
            console.log('Воспроизведение звука не удалось:', error);
        }
    }

    async playFingerSnap() {
        if (!this.fingerSnapSound) return;

        try {
            this.fingerSnapSound.currentTime = 0;
            await this.fingerSnapSound.play();
            console.log('Проигрываем finger-snap');
        } catch (error) {
            console.log('Ошибка воспроизведения finger-snap:', error);
        }
    }

    async enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.isAudioEnabled = true;
    }
}

// Typing animation
class TypingAnimation {
    constructor(audioManager, videoManager, audioVisualizer) {
        this.audioManager = audioManager;
        this.videoManager = videoManager;
        this.audioVisualizer = audioVisualizer;
        this.textElement = document.getElementById('typing-text');
        this.cursorElement = document.getElementById('cursor');
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.isComplete = false;
    }

    async start() {
        await this.audioManager.enableAudio();
        this.animate();
    }

    async animate() {
        if (this.isComplete) return;

        const currentWord = CONFIG.words[this.currentWordIndex];
        
        if (!this.isDeleting) {
            // Печатаем
            if (this.currentCharIndex < currentWord.length) {
                this.textElement.textContent = currentWord.substring(0, this.currentCharIndex + 1);
                this.currentCharIndex++;
                await this.audioManager.playKeySound();
                setTimeout(() => this.animate(), CONFIG.typeSpeed);
            } else {
                // Слово завершено
                if (this.currentWordIndex === CONFIG.words.length - 1) {
                    // Последнее слово - завершаем
                    this.complete();
                    return;
                } else {
                    // Пауза после завершения слова для кинематографичности
                    setTimeout(() => {
                        // Начинаем удаление
                        this.isDeleting = true;
                        this.animate();
                    }, CONFIG.pauseAfterWord);
                }
            }
        } else {
            // Удаляем
            if (this.currentCharIndex > 0) {
                this.textElement.textContent = currentWord.substring(0, this.currentCharIndex - 1);
                this.currentCharIndex--;
                setTimeout(() => this.animate(), CONFIG.deleteSpeed);
            } else {
                // Слово удалено, переходим к следующему
                this.isDeleting = false;
                this.currentWordIndex++;
                setTimeout(() => this.animate(), 200);
            }
        }
    }

    async handleVideoForWord(word) {
        // Видео-переходы убраны для более чистого эффекта
        return;
    }

    async complete() {
        this.isComplete = true;
        
        // Ждем 1 секунду после завершения ввода
        setTimeout(async () => {
            // Проигрываем finger-snap
            await this.audioManager.playFingerSnap();
            
            // Меняем стили для финального эффекта
            this.textElement.style.color = '#000000';
            this.cursorElement.style.display = 'none';
            
            // Меняем фон на белый
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.style.background = '#ffffff';
            
            setTimeout(() => {
                this.transitionToMainScreen();
            }, CONFIG.pauseAfterSnap);
        }, 1000); // Пауза 1 секунда перед finger-snap
    }

    transitionToMainScreen() {
        console.log('Transitioning to main screen');
        const loadingScreen = document.getElementById('loading-screen');
        const mainScreen = document.getElementById('main-screen');
        console.log('Loading screen:', loadingScreen);
        console.log('Main screen:', mainScreen);
        
        // Создаем постепенно затемняющийся фон
        const darkeningOverlay = document.createElement('div');
        darkeningOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000000;
            z-index: 9999;
            opacity: 0;
            animation: darkenBackground 1.8s cubic-bezier(0.68, 0.0, 0.265, 1.2) forwards;
        `;
        document.body.appendChild(darkeningOverlay);
        
        // Быстро скрываем курсор
        this.cursorElement.style.display = 'none';
        
        // Динамичный переход тонкого текста в жирный
        this.textElement.style.transition = 'all 0.2s cubic-bezier(0.68, 0.0, 0.265, 1.2)';
        this.textElement.style.fontWeight = '800';
        this.textElement.style.transform = 'scale(1.05)';
        
        // Быстро заменяем на анимированный элемент
        setTimeout(() => {
            // Скрываем оригинальный текст
            this.textElement.style.display = 'none';
            
            // Создаем элемент для анимации полета текста
            const transitionElement = document.createElement('div');
            transitionElement.className = 'screen-fill-black';
            transitionElement.textContent = 'live4code';
            // Принудительно фиксируем только font-weight, остальное оставляем CSS классу
            transitionElement.style.fontWeight = '800 !important';
            document.body.appendChild(transitionElement);
        }, 200);
        
        setTimeout(() => {
            // Сначала скрываем экран загрузки, но оставляем затемнение
            loadingScreen.style.display = 'none';
            mainScreen.classList.add('active');
            
            // Удаляем только текстовый элемент, оставляем затемнение на немного дольше
            const transitionElement = document.querySelector('.screen-fill-black');
            if (transitionElement && transitionElement.parentNode) {
                transitionElement.parentNode.removeChild(transitionElement);
            }
            
            // Убираем затемнение через небольшую задержку для плавного перехода
            setTimeout(() => {
                if (darkeningOverlay.parentNode) {
                    darkeningOverlay.style.transition = 'opacity 0.5s ease-out';
                    darkeningOverlay.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (darkeningOverlay.parentNode) {
                            darkeningOverlay.parentNode.removeChild(darkeningOverlay);
                        }
                    }, 500);
                }
            }, 200);
            
            // Инициализируем анимации основного экрана
            this.initMainScreenAnimations();
        }, 2000); // Скорректировано под новый быстрый переход
    }

    initMainScreenAnimations() {
        console.log('Initializing main screen animations');
        
        // Инициализируем звездное небо
        if (window.app && window.app.starfieldManager) {
            window.app.starfieldManager.destroy();
        }
        window.app.starfieldManager = new StarfieldManager();
        
        // Инициализируем GitHub проекты
        if (window.app && window.app.githubManager) {
            window.app.githubManager.init();
        }
        
        // Инициализируем 3D куб с аудио-визуализатором
        this.cubeController = new CubeController(this.audioVisualizer);
        console.log('Cube controller initialized:', this.cubeController);
        
        // Запускаем аудио-визуализацию с небольшой задержкой
        setTimeout(() => {
            const cubeElement = document.getElementById('cube');
            const musicBtn = document.getElementById('music-toggle');
            
            if (cubeElement && this.audioVisualizer) {
                this.audioVisualizer.startVisualization(cubeElement);
                
                // Устанавливаем состояние кнопки музыки
                if (musicBtn) {
                    musicBtn.classList.add('playing');
                    musicBtn.title = 'Выключить музыку';
                }
            }
        }, 1000);
    }
}

// Page visibility handling
class VisibilityManager {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Приостанавливаем анимации когда вкладка не видна
                document.body.style.animationPlayState = 'paused';
            } else {
                // Возобновляем анимации когда вкладка становится видимой
                document.body.style.animationPlayState = 'running';
            }
        });
    }
}

// 3D Cube Controller - Inside View
class CubeController {
    constructor(audioVisualizer = null) {
        this.cube = document.getElementById('cube');
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.faces = document.querySelectorAll('.cube-face');
        this.currentFace = 'front';
        this.audioVisualizer = audioVisualizer;
        
        this.init();
    }
    
    init() {
        // Устанавливаем начальное состояние
        this.cube.classList.add('show-front');
        
        // Добавляем обработчики для навигационных кнопок
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                if (target) {
                    this.rotateTo(target);
                }
            });
        });
        
        // Добавляем обработчик для кнопки музыки
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle && this.audioVisualizer) {
            musicToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMusic();
            });
        }
        
        // Добавляем обработчики для граней куба - только для видимых граней
        this.faces.forEach(face => {
            face.addEventListener('click', (e) => {
                e.stopPropagation();
                const faceType = face.getAttribute('data-face');
                
                // Определяем соседние грани для текущего положения
                const adjacentFaces = this.getAdjacentFaces(this.currentFace);
                
                // Поворачиваемся только к соседним граням
                if (adjacentFaces.includes(faceType)) {
                    this.rotateTo(faceType);
                }
            });
            
            // Добавляем визуальную подсказку для кликабельных граней
            face.addEventListener('mouseenter', (e) => {
                const faceType = face.getAttribute('data-face');
                const adjacentFaces = this.getAdjacentFaces(this.currentFace);
                
                if (adjacentFaces.includes(faceType)) {
                    face.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    face.style.cursor = 'pointer';
                } else {
                    face.style.cursor = 'default';
                }
            });
            
            face.addEventListener('mouseleave', (e) => {
                face.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            });
        });
        
        // Добавляем клавиатурную навигацию
        document.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
        
        // Добавляем подсказки для пользователя
        this.showNavigationHints();
    }
    
    getAdjacentFaces(currentFace) {
        // Определяем какие грани видны и кликабельны из текущего положения
        const adjacencyMap = {
            'front': ['right', 'left', 'top', 'bottom'],
            'right': ['front', 'back', 'top', 'bottom'],
            'back': ['right', 'left', 'top', 'bottom'],
            'left': ['front', 'back', 'top', 'bottom'],
            'top': ['front', 'right', 'back', 'left'],
            'bottom': ['front', 'right', 'back', 'left']
        };
        
        return adjacencyMap[currentFace] || [];
    }
    
    rotateTo(face) {
        if (this.currentFace === face) return;
        
        console.log(`Rotating cube from ${this.currentFace} to ${face}`);
        
        // Убираем все классы состояний
        this.cube.classList.remove(
            'show-front', 'show-right', 'show-back', 
            'show-left', 'show-top', 'show-bottom'
        );
        
        // Добавляем новый класс состояния
        this.cube.classList.add(`show-${face}`);
        
        console.log(`Cube classes after rotation:`, this.cube.className);
        
        // Обновляем активную кнопку навигации
        this.updateActiveButton(face);
        
        // Сохраняем текущее состояние
        this.currentFace = face;
        
        // Добавляем звуковой эффект
        this.playRotationSound();
        
        // Обновляем подсказки
        this.updateNavigationHints();
    }
    
    updateActiveButton(face) {
        this.navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-target') === face) {
                btn.classList.add('active');
            }
        });
    }
    
    handleKeyNavigation(e) {
        const keyMap = {
            'ArrowUp': 'top',
            'ArrowDown': 'bottom',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'KeyW': 'top',
            'KeyS': 'bottom',
            'KeyA': 'left',
            'KeyD': 'right',
            'Digit1': 'front',
            'Digit2': 'right',
            'Digit3': 'back',
            'Digit4': 'left',
            'Digit5': 'top',
            'Digit6': 'bottom'
        };
        
        const targetFace = keyMap[e.code];
        if (targetFace) {
            e.preventDefault();
            this.rotateTo(targetFace);
        }
    }
    
    playRotationSound() {
        // Создаем более мягкий звук поворота для внутреннего вида
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Более низкие частоты для ощущения "внутри"
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Звук не критичен, игнорируем ошибки
        }
    }
    
    showNavigationHints() {
        // Показываем подсказку при первом запуске
        const hint = document.createElement('div');
        hint.className = 'navigation-hint';
        hint.innerHTML = `
            <div class="hint-content">
                <h3>Навигация по кубу</h3>
                <p>• Кликайте по видимым граням</p>
                <p>• Используйте кнопки справа</p>
                <p>• Стрелки или WASD</p>
                <p>• Цифры 1-6</p>
            </div>
        `;
        
        document.body.appendChild(hint);
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 500);
        }, 5000);
        
        // Скрываем при клике
        hint.addEventListener('click', () => {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 500);
        });
    }
    
    updateNavigationHints() {
        // Обновляем визуальные подсказки для кликабельных граней
        const adjacentFaces = this.getAdjacentFaces(this.currentFace);
        
        this.faces.forEach(face => {
            const faceType = face.getAttribute('data-face');
            if (adjacentFaces.includes(faceType)) {
                face.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            } else {
                face.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            }
        });
    }
    
    // Переключение музыки
    toggleMusic() {
        if (!this.audioVisualizer) return;
        
        const musicBtn = document.getElementById('music-toggle');
        const icon = musicBtn.querySelector('i');
        
        if (this.audioVisualizer.isPlaying) {
            this.audioVisualizer.stopVisualization();
            musicBtn.classList.remove('playing');
            icon.className = 'fas fa-volume-mute';
            musicBtn.title = 'Включить музыку';
        } else {
            this.audioVisualizer.startVisualization(this.cube);
            musicBtn.classList.add('playing');
            icon.className = 'fas fa-volume-up';
            musicBtn.title = 'Выключить музыку';
        }
    }
    
    // Автоматическая демонстрация
    startDemo() {
        const faces = ['front', 'right', 'back', 'left', 'top', 'bottom'];
        let currentIndex = 0;
        
        const demoInterval = setInterval(() => {
            this.rotateTo(faces[currentIndex]);
            currentIndex = (currentIndex + 1) % faces.length;
            
            if (currentIndex === 0) {
                clearInterval(demoInterval);
            }
        }, 3000);
    }
}

// Audio Visualizer для ambient эффектов
class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.backgroundMusic = null;
        this.isPlaying = false;
        this.animationId = null;
        this.cubeElement = null;
        this.faces = null;
        this.isLocalFile = false;
        this.simpleMode = false; // Режим без Web Audio API
        
        this.init();
    }
    
    async init() {
        try {
            // Определяем протокол
            this.isLocalFile = window.location.protocol === 'file:';
            console.log('Protocol:', window.location.protocol, 'Local file:', this.isLocalFile);
            
            // Создаем аудио элемент для фоновой музыки
            this.backgroundMusic = new Audio('sounds/background.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0.3; // Тихий фон
            this.backgroundMusic.preload = 'auto';
            
            // Добавляем обработчики событий для отладки
            this.backgroundMusic.addEventListener('loadeddata', () => {
                console.log('Background music file loaded successfully');
            });
            
            this.backgroundMusic.addEventListener('error', (e) => {
                console.error('Background music loading error:', e);
            });
            
            this.backgroundMusic.addEventListener('canplaythrough', () => {
                console.log('Background music ready to play');
            });
            
            console.log('Background music element created');
            
            // Инициализируем Web Audio API только для HTTP протокола
            if (!this.isLocalFile) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.analyser = this.audioContext.createAnalyser();
                    
                    // Настройки анализатора для тонкого эффекта
                    this.analyser.fftSize = 256;
                    this.analyser.smoothingTimeConstant = 0.8; // Плавные переходы
                    
                    const bufferLength = this.analyser.frequencyBinCount;
                    this.dataArray = new Uint8Array(bufferLength);
                    
                    // Подключаем аудио к анализатору
                    const source = this.audioContext.createMediaElementSource(this.backgroundMusic);
                    source.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                    
                    console.log('Web Audio API initialized successfully');
                } catch (audioError) {
                    console.warn('Web Audio API failed, using simple mode:', audioError);
                    this.simpleMode = true;
                }
            } else {
                console.log('Local file detected, using simple audio mode without Web Audio API');
                this.simpleMode = true;
            }
            
            console.log('Audio visualizer initialized successfully');
            
        } catch (error) {
            console.error('Audio visualizer initialization failed:', error);
            this.simpleMode = true;
        }
    }
    
    async startVisualization(cubeElement) {
        console.log('Starting audio visualization...');
        console.log('Background music:', this.backgroundMusic);
        console.log('Simple mode:', this.simpleMode);
        console.log('Cube element:', cubeElement);
        
        if (!this.backgroundMusic) {
            console.error('Background music not ready');
            return;
        }
        
        this.cubeElement = cubeElement;
        this.faces = cubeElement.querySelectorAll('.cube-face');
        
        try {
            // Возобновляем аудио контекст если есть и приостановлен
            if (this.audioContext && this.audioContext.state === 'suspended') {
                console.log('Resuming audio context...');
                await this.audioContext.resume();
            }
            
            if (this.audioContext) {
                console.log('Audio context state:', this.audioContext.state);
            }
            
            // Запускаем музыку с плавным появлением
            this.backgroundMusic.volume = 0;
            console.log('Starting music playback...');
            await this.backgroundMusic.play();
            this.fadeInMusic();
            
            this.isPlaying = true;
            
            // Запускаем анимацию (в простом режиме будет без анализа частот)
            this.animate();
            
            console.log('Audio visualization started successfully');
            
        } catch (error) {
            console.error('Failed to start audio visualization:', error);
        }
    }
    
    fadeInMusic() {
        const targetVolume = 0.25; // Еще тише для ambient эффекта
        const fadeStep = 0.01;
        const fadeInterval = 100;
        
        const fadeIn = setInterval(() => {
            if (this.backgroundMusic.volume < targetVolume) {
                this.backgroundMusic.volume = Math.min(
                    this.backgroundMusic.volume + fadeStep, 
                    targetVolume
                );
            } else {
                clearInterval(fadeIn);
            }
        }, fadeInterval);
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        // Убираем анимацию - просто проверяем что музыка играет
        // Для ambient трека визуальные эффекты не нужны
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    getAverageFrequency(startIndex, endIndex) {
        let sum = 0;
        for (let i = startIndex; i < endIndex && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / (endIndex - startIndex);
    }
    
    applySubtleEffects(bass, mid, high) {
        // Убираем все визуальные эффекты для спокойного ambient трека
        // Оставляем только воспроизведение музыки без динамики
        return;
    }
    
    stopVisualization() {
        this.isPlaying = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
        
        console.log('Audio visualization stopped');
    }
    
    // Управление громкостью
    setVolume(volume) {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    // Переключение воспроизведения
    toggle() {
        if (!this.backgroundMusic) return;
        
        if (this.isPlaying) {
            this.stopVisualization();
        } else {
            this.startVisualization(this.cubeElement);
        }
    }
}

// Starfield Manager
class StarfieldManager {
    constructor() {
        this.starfield = document.getElementById('starfield');
        this.shootingStars = document.getElementById('shooting-stars');
        this.spaceParticles = document.getElementById('space-particles');
        this.asteroids = document.getElementById('asteroids');
        this.stars = [];
        this.shootingStarInterval = null;
        this.particleInterval = null;
        this.asteroidInterval = null;
        this.init();
    }

    init() {
        // Убираем статичные звезды, оставляем только движущиеся элементы
        this.startShootingStars();
        this.startSpaceParticles();
        this.startAsteroids();
    }

    startShootingStars() {
        // Создаем больше звезд для эффекта полета
        this.shootingStarInterval = setInterval(() => {
            // Создаем больше звезд одновременно для плотного эффекта
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.createShootingStar();
                }, i * 150);
            }
        }, 1000 + Math.random() * 1500); // Каждые 1-2.5 секунды
    }

    createShootingStar() {
        const shootingStar = document.createElement('div');
        
        // Случайный тип звезды
        const starType = Math.random();
        if (starType < 0.3) {
            shootingStar.className = 'shooting-star dense';
        } else if (starType < 0.7) {
            shootingStar.className = 'shooting-star';
        } else {
            shootingStar.className = 'shooting-star bright';
        }
        
        // Создаем туннельный эффект - звезды появляются из случайной точки в центральной окружности
        const tunnelRadius = Math.min(window.innerWidth, window.innerHeight) * 0.12; // Меньший радиус для звезд
        const startAngle = Math.random() * Math.PI * 2;
        const startDistance = Math.random() * tunnelRadius;
        const startX = Math.cos(startAngle) * startDistance;
        const startY = Math.sin(startAngle) * startDistance;
        
        // Звезды летят радиально от своей начальной позиции наружу (туннельный эффект)
        const endDistance = Math.min(window.innerWidth, window.innerHeight) * 0.6;
        const endX = Math.cos(startAngle) * endDistance;
        const endY = Math.sin(startAngle) * endDistance;
        
        // Устанавливаем CSS переменные для начальной и конечной позиции
        shootingStar.style.setProperty('--start-x', startX + 'px');
        shootingStar.style.setProperty('--start-y', startY + 'px');
        shootingStar.style.setProperty('--end-x', endX + 'px');
        shootingStar.style.setProperty('--end-y', endY + 'px');
        
        // Случайная задержка
        shootingStar.style.animationDelay = Math.random() * 3 + 's';
        
        this.shootingStars.appendChild(shootingStar);
        
        // Удаляем элемент после анимации
        const duration = shootingStar.classList.contains('dense') ? 6000 : 
                        shootingStar.classList.contains('bright') ? 3000 : 4000;
        setTimeout(() => {
            if (shootingStar.parentNode) {
                shootingStar.parentNode.removeChild(shootingStar);
            }
        }, duration + 3000);
    }

    startSpaceParticles() {
        // Создаем больше частиц для плотного эффекта
        this.particleInterval = setInterval(() => {
            // Создаем еще больше частиц для заполнения пространства
            for (let i = 0; i < 12; i++) {
                setTimeout(() => {
                    this.createParticle();
                }, i * 60);
            }
        }, 500); // Каждые 0.5 секунды
    }

    createParticle() {
        const particle = document.createElement('div');
        
        // Случайный тип частицы
        const particleType = Math.random();
        if (particleType < 0.3) {
            particle.className = 'particle fast';
        } else if (particleType < 0.7) {
            particle.className = 'particle';
        } else {
            particle.className = 'particle slow';
        }
        
        // Создаем туннельный эффект - частицы появляются из случайной точки в центральной окружности
        const tunnelRadius = Math.min(window.innerWidth, window.innerHeight) * 0.15; // Радиус центральной окружности
        const startAngle = Math.random() * Math.PI * 2;
        const startDistance = Math.random() * tunnelRadius;
        const startX = Math.cos(startAngle) * startDistance;
        const startY = Math.sin(startAngle) * startDistance;
        
        // Частицы летят радиально от своей начальной позиции наружу (туннельный эффект)
        const endDistance = Math.min(window.innerWidth, window.innerHeight) * 0.8;
        const endX = Math.cos(startAngle) * endDistance;
        const endY = Math.sin(startAngle) * endDistance;
        
        // Устанавливаем CSS переменные для начальной и конечной позиции
        particle.style.setProperty('--start-x', startX + 'px');
        particle.style.setProperty('--start-y', startY + 'px');
        particle.style.setProperty('--end-x', endX + 'px');
        particle.style.setProperty('--end-y', endY + 'px');
        
        // Случайная задержка
        particle.style.animationDelay = Math.random() * 4 + 's';
        
        this.spaceParticles.appendChild(particle);
        
        // Удаляем элемент после анимации
        const duration = particle.classList.contains('fast') ? 8000 : 
                        particle.classList.contains('slow') ? 18000 : 12000;
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, duration + 2000);
    }

    startAsteroids() {
        // Создаем астероиды реже чем звезды
        this.asteroidInterval = setInterval(() => {
            this.createAsteroid();
        }, 4000 + Math.random() * 6000); // Каждые 4-10 секунд
    }

    createAsteroid() {
        const asteroid = document.createElement('div');
        
        // Случайный размер астероида
        const sizeType = Math.random();
        if (sizeType < 0.5) {
            asteroid.className = 'asteroid small';
        } else if (sizeType < 0.8) {
            asteroid.className = 'asteroid medium';
        } else {
            asteroid.className = 'asteroid large';
        }
        
        // Случайное направление (влево или вправо)
        if (Math.random() < 0.5) {
            asteroid.classList.add('right');
        }
        
        // Случайное вертикальное смещение для разнообразия траекторий
        const offsetY = (Math.random() - 0.5) * 200; // от -100px до +100px
        asteroid.style.setProperty('--offset-y', offsetY + 'px');
        
        // Случайная задержка
        asteroid.style.animationDelay = Math.random() * 4 + 's';
        
        // Случайная форма астероида
        const borderRadius = `${20 + Math.random() * 30}% ${40 + Math.random() * 40}% ${30 + Math.random() * 40}% ${20 + Math.random() * 30}%`;
        asteroid.style.borderRadius = borderRadius;
        
        this.asteroids.appendChild(asteroid);
        
        // Удаляем элемент после анимации
        const duration = asteroid.classList.contains('small') ? 10000 : 
                        asteroid.classList.contains('medium') ? 14000 : 16000;
        setTimeout(() => {
            if (asteroid.parentNode) {
                asteroid.parentNode.removeChild(asteroid);
            }
        }, duration + 4000);
    }

    destroy() {
        if (this.shootingStarInterval) {
            clearInterval(this.shootingStarInterval);
        }
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
        if (this.asteroidInterval) {
            clearInterval(this.asteroidInterval);
        }
        
        // Очищаем все движущиеся элементы
        this.shootingStars.innerHTML = '';
        this.spaceParticles.innerHTML = '';
        this.asteroids.innerHTML = '';
    }
}

class GitHubProjectsManager {
    constructor() {
        this.username = 'l1ve4code';
        this.projectsContainer = null;
        this.cache = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 минут
    }

    async init() {
        this.projectsContainer = document.getElementById('projects-content');
        await this.loadProjects();
    }

    async loadProjects() {
        try {
            // Проверяем кэш
            if (this.cache && Date.now() - this.cache.timestamp < this.cacheExpiry) {
                this.renderProjects(this.cache.data);
                return;
            }

            this.showLoading();
            
            const response = await fetch(`https://api.github.com/users/${this.username}/repos?sort=updated&per_page=100`);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const repos = await response.json();
            
            // Фильтруем и сортируем по звездам
            const topProjects = repos
                .filter(repo => !repo.fork && repo.stargazers_count >= 0) // Исключаем форки
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 3);

            // Кэшируем результат
            this.cache = {
                data: topProjects,
                timestamp: Date.now()
            };

            this.renderProjects(topProjects);

        } catch (error) {
            console.error('Ошибка загрузки проектов:', error);
            this.showError();
        }
    }

    showLoading() {
        if (!this.projectsContainer) return;
        
        this.projectsContainer.innerHTML = `
            <div class="projects-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загружаю проекты...</span>
            </div>
        `;
    }

    renderProjects(projects) {
        if (!this.projectsContainer) return;

        if (projects.length === 0) {
            this.showError('Проекты не найдены');
            return;
        }

        const projectsHTML = projects.map(project => {
            const language = project.language || 'Code';
            const description = project.description || 'Описание отсутствует';
            const stars = project.stargazers_count;
            
            return `
                <div class="project-item" onclick="window.open('${project.html_url}', '_blank')">
                    <div class="project-language">${language}</div>
                    <h3>
                        <i class="fab fa-github"></i>
                        ${project.name}
                    </h3>
                    <p>${description}</p>
                    <div class="project-stars">
                        <i class="fas fa-star"></i>
                        <span>${stars}</span>
                    </div>
                </div>
            `;
        }).join('');

        const githubLinkHTML = `
            <div class="github-link" onclick="window.open('https://github.com/${this.username}', '_blank')">
                <i class="fab fa-github"></i>
                <span>Все проекты на GitHub</span>
            </div>
        `;

        this.projectsContainer.innerHTML = projectsHTML + githubLinkHTML;
    }

    showError(message = 'Не удалось загрузить проекты') {
        if (!this.projectsContainer) return;
        
        this.projectsContainer.innerHTML = `
            <div class="projects-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.app.githubManager.loadProjects()">
                    Попробовать снова
                </button>
            </div>
        `;
    }

    // Метод для принудительного обновления
    async refresh() {
        this.cache = null;
        await this.loadProjects();
    }
}

// Initialize application
class App {
    constructor() {
        this.videoManager = new VideoManager();
        this.audioManager = new AudioManager();
        this.audioVisualizer = new AudioVisualizer();
        this.typingAnimation = new TypingAnimation(this.audioManager, this.videoManager, this.audioVisualizer);
        this.visibilityManager = new VisibilityManager();
        this.starfieldManager = null;
        this.githubManager = new GitHubProjectsManager();
        
        this.init();
    }

    init() {
        // Wait for DOM and start typing animation
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const startPrompt = document.getElementById('start-prompt');
        const typingContainer = document.getElementById('typing-container');
        
        console.log('App initialized, setting up event listeners');
        console.log('Start prompt:', startPrompt);
        console.log('Typing container:', typingContainer);
        
        if (startPrompt) {
            startPrompt.addEventListener('click', async () => {
                console.log('Start prompt clicked');
                // Hide prompt and show typing container
                startPrompt.style.display = 'none';
                typingContainer.style.display = 'flex';
                
                // Small delay for smoothness
                setTimeout(() => {
                    console.log('Starting typing animation');
                    this.typingAnimation.start();
                }, 300);
            });
        } else {
            console.error('Start prompt not found!');
        }
    }
}

// Start the application
window.app = new App(); 