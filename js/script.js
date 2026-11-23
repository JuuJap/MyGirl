(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = document.querySelectorAll(".reveal");

  // Entrada suave dos blocos conforme aparecem na tela.
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach((section) => section.classList.add("visible"));
  }

  const body = document.body;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const authorImage = document.querySelector(".author-feature-image");

  // Elementos da carta.
  const envelopeButton = document.getElementById("open-letter");
  const letterDialog = document.getElementById("letter-dialog");
  const closeLetterButton = document.getElementById("close-letter");
  const themeSwitch = document.getElementById("theme-switch");
  const themeToggle = document.getElementById("theme-toggle");
  const themeToggleLabel = document.getElementById("theme-toggle-label");
  let purpleThemeActive = false;
  let purpleThemeUnlocked = false;
  let bannerSwapTimer = 0;

  function swapBanner(useLetterBanner) {
    if (!authorImage) return;

    const nextSrc = useLetterBanner
      ? authorImage.dataset.letterSrc
      : authorImage.dataset.defaultSrc;

    if (!nextSrc || authorImage.getAttribute("src") === nextSrc) return;

    authorImage.classList.add("is-changing");
    window.clearTimeout(bannerSwapTimer);

    bannerSwapTimer = window.setTimeout(() => {
      const handleLoaded = () => authorImage.classList.remove("is-changing");
      authorImage.addEventListener("load", handleLoaded, { once: true });
      authorImage.addEventListener("error", handleLoaded, { once: true });
      authorImage.setAttribute("src", nextSrc);

      // Remove a classe também quando a imagem já estiver no cache.
      if (authorImage.complete && authorImage.naturalWidth > 0) {
        window.setTimeout(handleLoaded, 80);
      }
    }, reduceMotion ? 0 : 180);

    authorImage.alt = useLetterBanner
      ? "Banner roxo e preto do livro Uma Mulher no Escuro, de Raphael Montes"
      : "Garçom de terno preto e luvas brancas segurando uma bandeja";
  }

  function updateThemeToggle() {
    if (!themeToggle || !themeToggleLabel) return;

    themeToggleLabel.textContent = purpleThemeActive ? "Tema original" : "Tema roxo";
    themeToggle.setAttribute("aria-pressed", String(purpleThemeActive));
    themeToggle.setAttribute(
      "aria-label",
      purpleThemeActive ? "Voltar ao tema original vermelho e preto" : "Mudar para o tema roxo e preto"
    );
  }

  function setSiteTheme(usePurpleTheme) {
    purpleThemeActive = Boolean(usePurpleTheme);
    body.classList.toggle("purple-theme", purpleThemeActive);

    if (themeColorMeta) {
      themeColorMeta.content = purpleThemeActive ? "#10091b" : "#080607";
    }

    swapBanner(purpleThemeActive);
    switchMusicTrack(purpleThemeActive);

    // O seletor aparece a partir da primeira abertura do envelope e permanece disponível.
    if (!purpleThemeUnlocked) {
      purpleThemeUnlocked = true;
      body.classList.add("theme-switch-unlocked");
      if (themeSwitch) themeSwitch.hidden = false;
    }

    updateThemeToggle();
  }

  function toggleSiteTheme() {
    if (!purpleThemeUnlocked) return;
    setSiteTheme(!purpleThemeActive);
  }

  function enterLetterTheme() {
    setSiteTheme(true);
  }

  function openLetter() {
    if (!envelopeButton || !letterDialog || letterDialog.open) return;

    envelopeButton.classList.add("is-opening");
    // A mudança de tema e faixa começa junto com a animação do envelope.
    enterLetterTheme();

    const delay = reduceMotion ? 0 : 300;
    window.setTimeout(() => {
      if (typeof letterDialog.showModal === "function") {
        if (!letterDialog.open) letterDialog.showModal();
      } else {
        letterDialog.setAttribute("open", "");
        letterDialog.classList.add("dialog-fallback-open");
      }
    }, delay);
  }

  function closeLetter() {
    if (!letterDialog) return;

    if (typeof letterDialog.close === "function" && letterDialog.open) {
      letterDialog.close();
      // Fechar a carta mantém o tema atual e a faixa escolhida.
    } else {
      letterDialog.removeAttribute("open");
      letterDialog.classList.remove("dialog-fallback-open");
      envelopeButton?.classList.remove("is-opening");
    }

    envelopeButton?.focus();
  }

  envelopeButton?.addEventListener("click", openLetter);
  closeLetterButton?.addEventListener("click", closeLetter);
  letterDialog?.addEventListener("click", (event) => {
    if (event.target === letterDialog) closeLetter();
  });
  letterDialog?.addEventListener("close", () => {
    envelopeButton?.classList.remove("is-opening");
  });

  themeToggle?.addEventListener("click", toggleSiteTheme);

  // Música: Joji no tema original e Jão no tema roxo.
  // A faixa acompanha o tema escolhido, independentemente de a carta estar aberta.
  const mainMusic = document.getElementById("background-music");
  const letterMusic = document.getElementById("letter-background-music");
  const musicIndicator = document.getElementById("music-indicator");
  const musicTitle = document.getElementById("music-title");
  const musicArtist = document.getElementById("music-artist");

  const mainVolume = 0.25;
  const letterVolume = 0.12;
  let activeMusic = mainMusic;
  let audioFadeFrame = 0;
  let audioTransitionId = 0;

  function updateMusicIndicator(useLetterTrack, isPlaying) {
    if (musicTitle) musicTitle.textContent = useLetterTrack ? "O Amor" : "Gimme Love";
    if (musicArtist) musicArtist.textContent = useLetterTrack ? " - Jão" : " - Joji";

    musicIndicator?.classList.toggle("is-playing", isPlaying);
    if (musicIndicator) {
      musicIndicator.setAttribute(
        "aria-label",
        isPlaying
          ? (useLetterTrack ? "Tocando O Amor, de Jão" : "Tocando Gimme Love, de Joji")
          : (useLetterTrack ? "O Amor, de Jão — aguardando reprodução" : "Gimme Love, de Joji — aguardando reprodução")
      );
    }
  }

  function animateAudioCrossfade(fromAudio, toAudio, targetVolume, transitionId) {
    if (audioFadeFrame) cancelAnimationFrame(audioFadeFrame);

    const fromStart = fromAudio && !fromAudio.paused ? fromAudio.volume : 0;
    const startTime = performance.now();
    const duration = reduceMotion ? 0 : 1250;

    const finish = () => {
      if (transitionId !== audioTransitionId) return;
      if (fromAudio && fromAudio !== toAudio) {
        fromAudio.pause();
        fromAudio.volume = 0;
      }
      toAudio.volume = targetVolume;
      activeMusic = toAudio;
      updateMusicIndicator(toAudio === letterMusic, !toAudio.paused);
      audioFadeFrame = 0;
    };

    if (duration === 0) {
      if (fromAudio && fromAudio !== toAudio) {
        fromAudio.pause();
        fromAudio.volume = 0;
      }
      toAudio.volume = targetVolume;
      activeMusic = toAudio;
      updateMusicIndicator(toAudio === letterMusic, !toAudio.paused);
      return;
    }

    const step = (now) => {
      if (transitionId !== audioTransitionId) return;

      const progress = Math.min((now - startTime) / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);

      if (fromAudio && !fromAudio.paused) {
        fromAudio.volume = fromStart * (1 - eased);
      }
      toAudio.volume = targetVolume * eased;

      if (progress < 1) {
        audioFadeFrame = requestAnimationFrame(step);
      } else {
        finish();
      }
    };

    audioFadeFrame = requestAnimationFrame(step);
  }

  function switchMusicTrack(useLetterTrack) {
    const targetAudio = useLetterTrack ? letterMusic : mainMusic;
    const outgoingAudio = useLetterTrack ? mainMusic : letterMusic;
    const targetVolume = useLetterTrack ? letterVolume : mainVolume;

    if (!targetAudio) return;

    const transitionId = ++audioTransitionId;
    if (audioFadeFrame) {
      cancelAnimationFrame(audioFadeFrame);
      audioFadeFrame = 0;
    }

    targetAudio.loop = true;

    // A faixa já está tocando: apenas suaviza até o volume adequado.
    if (activeMusic === targetAudio && !targetAudio.paused) {
      animateAudioCrossfade(outgoingAudio, targetAudio, targetVolume, transitionId);
      updateMusicIndicator(useLetterTrack, true);
      return;
    }

    targetAudio.volume = 0;
    let playAttempt;

    try {
      playAttempt = targetAudio.play();
    } catch (_error) {
      updateMusicIndicator(activeMusic === letterMusic, Boolean(activeMusic && !activeMusic.paused));
      return;
    }

    const beginFade = () => {
      if (transitionId !== audioTransitionId) {
        if (purpleThemeActive !== useLetterTrack) {
          targetAudio.pause();
          targetAudio.volume = 0;
        }
        return;
      }
      activeMusic = targetAudio;
      updateMusicIndicator(useLetterTrack, true);
      animateAudioCrossfade(outgoingAudio, targetAudio, targetVolume, transitionId);
    };

    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt.then(beginFade).catch(() => {
        // Se o navegador bloquear a troca, tentamos novamente no próximo gesto do visitante.
        updateMusicIndicator(activeMusic === letterMusic, Boolean(activeMusic && !activeMusic.paused));
      });
    } else {
      beginFade();
    }
  }

  if (mainMusic) {
    mainMusic.loop = true;
    mainMusic.volume = 0;
    mainMusic.play().then(() => {
      if (purpleThemeActive) {
        mainMusic.pause();
        mainMusic.volume = 0;
        return;
      }
      activeMusic = mainMusic;
      updateMusicIndicator(false, true);
      animateAudioCrossfade(null, mainMusic, mainVolume, ++audioTransitionId);
    }).catch(() => {
      updateMusicIndicator(false, false);
    });
  }

  if (letterMusic) {
    letterMusic.loop = true;
    letterMusic.volume = 0;
  }

  // Se o autoplay for bloqueado, um toque/clique normal inicia a faixa do tema atual.
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#open-letter") || event.target.closest("#close-letter")) return;

    const desiredAudio = purpleThemeActive ? letterMusic : mainMusic;
    if (desiredAudio?.paused) switchMusicTrack(purpleThemeActive);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.target.closest?.("#open-letter") || event.target.closest?.("#close-letter")) return;

    const desiredAudio = purpleThemeActive ? letterMusic : mainMusic;
    if (desiredAudio?.paused) switchMusicTrack(purpleThemeActive);
  }, true);

  // Pequeno som de confirmação ao clicar na imagem do vídeo (sem arquivo extra).
  const videoLink = document.getElementById("video-link");
  let audioContext;

  function playVideoClickSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      audioContext ||= new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume();

      const now = audioContext.currentTime;
      [660, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.075;
        const end = start + 0.19;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.055, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(end + 0.015);
      });
    } catch (_error) {
      // O link do YouTube continua funcionando mesmo se o dispositivo não suportar o efeito.
    }
  }

  videoLink?.addEventListener("click", () => {
    playVideoClickSound();
    videoLink.classList.remove("is-activated");
    void videoLink.offsetWidth;
    videoLink.classList.add("is-activated");
    window.setTimeout(() => videoLink.classList.remove("is-activated"), 520);
  });
})();
