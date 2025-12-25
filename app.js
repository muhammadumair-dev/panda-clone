// Player controls and autoplay handling
document.addEventListener('DOMContentLoaded', function () {
  const video = document.getElementById('mainVideo');
  const playBtn = document.getElementById('playBtn');
  const wrapper = document.getElementById('videoWrapper');

  if (!video) return;

  function updateButton() {
    playBtn.textContent = (video.paused || video.ended) ? '▶' : '❚❚';
  }

  async function tryAutoplay() {
    try {
      // ensure muted (required for autoplay in many browsers)
      video.muted = true;
      await video.play();
    } catch (err) {
      // autoplay blocked — show the play button so user can start the video
      playBtn.classList.remove('hidden');
      // keep button visible
      playBtn.focus();
    }
  }

  function togglePlay() {
    if (video.paused || video.ended) video.play(); else video.pause();
  }

  playBtn.addEventListener('click', function (e) { e.preventDefault(); togglePlay(); });
  video.addEventListener('click', togglePlay);

  video.addEventListener('play', function () { wrapper.classList.add('playing'); updateButton(); });
  video.addEventListener('pause', function () { wrapper.classList.remove('playing'); updateButton(); });
  video.addEventListener('ended', function () { wrapper.classList.remove('playing'); updateButton(); });

  // small delay so page layout settles, then try autoplay
  setTimeout(tryAutoplay, 200);
  updateButton();

  // NEWS SLIDER INIT (drag, arrows, keyboard, autoplay)
  (function(){
    const slider = document.getElementById('newsSlider');
    const prevBtn = document.getElementById('newsPrevBtn');
    const nextBtn = document.getElementById('newsNextBtn');
    if(!slider) return;

    const gap = 18; // matches CSS gap
    const getSlideWidth = () => {
      const slide = slider.querySelector('.slide');
      if(!slide) return slider.clientWidth * 0.8;
      return slide.getBoundingClientRect().width + gap;
    };

    function scrollNext(){
      const max = slider.scrollWidth - slider.clientWidth;
      // If we're at (or very near) the end, wrap back to start
      if (Math.abs(slider.scrollLeft - max) <= 2) {
        slider.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: getSlideWidth(), behavior: 'smooth' });
      }
    }
    function scrollPrev(){
      // If we're at (or very near) the start, wrap to the end
      if (slider.scrollLeft <= 4) {
        slider.scrollTo({ left: slider.scrollWidth, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: -getSlideWidth(), behavior: 'smooth' });
      }
    }

    nextBtn?.addEventListener('click', scrollNext);
    prevBtn?.addEventListener('click', scrollPrev);

    // pointer drag
    let isDown = false, startX = 0, scrollStart = 0;
    slider.addEventListener('pointerdown', (e)=>{
      isDown = true; slider.setPointerCapture(e.pointerId);
      startX = e.clientX; scrollStart = slider.scrollLeft;
      slider.classList.add('dragging');
      pauseAuto();
    });
    slider.addEventListener('pointermove', (e)=>{
      if(!isDown) return;
      const dx = e.clientX - startX; slider.scrollLeft = scrollStart - dx;
    });
    slider.addEventListener('pointerup', (e)=>{ isDown = false; slider.releasePointerCapture(e.pointerId); slider.classList.remove('dragging'); resumeAuto(); });
    slider.addEventListener('pointercancel', ()=>{ isDown = false; slider.classList.remove('dragging'); resumeAuto(); });

    // touch fallback
    slider.addEventListener('touchstart', ()=>pauseAuto());
    slider.addEventListener('touchend', ()=>resumeAuto());

    // disable mouse wheel on slider to keep interactions to touch/drag & arrows
    slider.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });

    // keyboard
    slider.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight') { e.preventDefault(); scrollNext(); }
      if(e.key === 'ArrowLeft') { e.preventDefault(); scrollPrev(); }
    });

    // autoplay
    let autoTimer = null;
    function startAuto(){ if(autoTimer) return; autoTimer = setInterval(scrollNext, 3500); }
    function pauseAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer = null; } }
    function resumeAuto(){ if(!autoTimer) startAuto(); }

    slider.addEventListener('mouseenter', pauseAuto);
    slider.addEventListener('mouseleave', resumeAuto);

    // begin
    startAuto();
  })();

  // NEWS TRACK NAV (the other slider on the page)
  (function(){
    const track = document.getElementById('sliderTrack');
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const fadeLeft = document.getElementById('fadeLeft');
    const fadeRight = document.getElementById('fadeRight');
    if(!track) return;

    const cardWidth = () => {
      const c = track.querySelector('.card');
      return c ? c.getBoundingClientRect().width + 18 : 260;
    };

    function scrollNext(){
      const max = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft + cardWidth() >= max - 2) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: cardWidth(), behavior: 'smooth' });
      }
    }
    function scrollPrev(){
      if (track.scrollLeft <= 4) {
        track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -cardWidth(), behavior: 'smooth' });
      }
    }

    next?.addEventListener('click', scrollNext);
    prev?.addEventListener('click', scrollPrev);

    function updateFades(){
      if(!fadeLeft || !fadeRight) return;
      const max = track.scrollWidth - track.clientWidth - 2;
      if(track.scrollLeft <= 4) fadeLeft.style.opacity = 0; else fadeLeft.style.opacity = 1;
      if(track.scrollLeft >= max - 4) fadeRight.style.opacity = 0; else fadeRight.style.opacity = 1;
    }

    track.addEventListener('scroll', updateFades);
    window.addEventListener('resize', updateFades);

    // disable mouse wheel on the news track — use arrows or drag/touch instead
    track.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });

    // init
    setTimeout(updateFades, 200);
  })();

  // scroll-to-top button behavior
  const scrollBtn = document.getElementById('scrollTopBtn');
  if(scrollBtn){
    const checkScroll = () => {
      if(window.scrollY > 300) scrollBtn.classList.add('show'); else scrollBtn.classList.remove('show');
    };
    window.addEventListener('scroll', checkScroll, { passive: true });
    scrollBtn.addEventListener('click', ()=> window.scrollTo({ top: 0, behavior: 'smooth' }));
    // keyboard activation
    scrollBtn.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    // initial check
    checkScroll();
  }

  // navbar: hide on scroll down, reveal on scroll up
  (function(){
    const nav = document.querySelector('.navbar');
    if(!nav) return;
    let lastY = window.scrollY;
    let ticking = false;
    const threshold = 50;

    function onScroll(){
      const y = window.scrollY;
      // add scrolled class after threshold for stronger shadow
      if(y > threshold) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');

      if(y <= 0){ nav.classList.remove('hidden'); lastY = y; return; }

      if(y > lastY && y > threshold){
        // scrolling down
        nav.classList.add('hidden');
      } else if(y < lastY){
        // scrolling up
        nav.classList.remove('hidden');
      }

      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });

  })();

});