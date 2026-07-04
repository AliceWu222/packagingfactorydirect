(function(){
  function qs(selector, root){ return (root || document).querySelector(selector); }
  function qsa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function normalize(text){ return (text || '').toString().toLowerCase().replace(/\s+/g, ' ').trim(); }

  function productsPageUrl(query){
    var q = encodeURIComponent(query || '');
    if(window.location.protocol === 'file:'){
      var current = window.location.pathname || '';
      var base = current.indexOf('/products/') !== -1 ? '../products.html' : 'products.html';
      return base + (q ? '?q=' + q : '');
    }
    return '/products.html' + (q ? '?q=' + q : '');
  }

  function isProductsPage(){
    var path = window.location.pathname.toLowerCase();
    return path.endsWith('/products.html') || path.endsWith('/products') || !!qs('[data-product-search]') || qsa('article.product-card').length > 10;
  }

  function expandSearchTerms(query){
    return normalize(query).split(' ').filter(Boolean);
  }

  function filterProductCards(query){
    var cards = qsa('article.product-card');
    if(!cards.length) return false;
    var rawQuery = normalize(query);
    var terms = expandSearchTerms(query);
    var visible = 0;
    cards.forEach(function(card){
      var img = card.querySelector('img');
      var haystack = normalize([card.getAttribute('data-search') || '', card.textContent || '', img ? img.alt : ''].join(' '));
      var exactPhrase = rawQuery && haystack.indexOf(rawQuery) !== -1;
      var andMatched = !terms.length || terms.every(function(term){ return haystack.indexOf(term) !== -1; });
      var matched = !terms.length || exactPhrase || andMatched;
      card.style.display = matched ? '' : 'none';

      if(matched) visible += 1;
    });
    var status = qs('#searchStatus');
    if(status){
      status.textContent = terms.length ? (visible ? 'Found ' + visible + ' matching products for "' + query + '".' : 'No products found for "' + query + '". Try Custom Gift Boxes, Magnetic Packaging, Rigid Boxes, Mailer Boxes, Paper Bags, food packaging box, foam insert, cylinder tube packaging or cardstock product boxes.') : '';
    }
    return true;
  }

  function initSearch(){
    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q') || params.get('search') || '';
    var productPage = isProductsPage();

    if(productPage && initial){
      qsa('[data-product-search], form.search input').forEach(function(input){
        if(document.activeElement !== input) input.value = initial;
      });
      filterProductCards(initial);
    }

    qsa('[data-product-search]').forEach(function(input){
      input.addEventListener('input', function(){ filterProductCards(input.value); });
    });

    qsa('form.search, [data-global-search]').forEach(function(form){
      form.addEventListener('submit', function(event){
        event.preventDefault();
        var input = form.querySelector('input');
        var query = input ? input.value.trim() : '';
        if(isProductsPage()){
          filterProductCards(query);
          if(window.history && window.history.replaceState){
            window.history.replaceState(null, '', productsPageUrl(query));
          }
        }else{
          window.location.href = productsPageUrl(query);
        }
      });
    });
  }


  function initHeroSlider(){
    var hero = qs('main.hero');
    if(!hero) return;
    var slides = qsa('.slide', hero);
    var dots = qsa('.hero-controls .dot', hero);
    if(slides.length < 2) return;

    var current = slides.findIndex(function(slide){ return slide.classList.contains('active'); });
    if(current < 0) current = 0;
    var timer = null;
    var delay = 5600;

    function show(index){
      current = (index + slides.length) % slides.length;
      slides.forEach(function(slide, i){ slide.classList.toggle('active', i === current); });
      dots.forEach(function(dot, i){ dot.classList.toggle('active', i === current); });
    }

    function start(){
      stop();
      timer = window.setInterval(function(){ show(current + 1); }, delay);
    }

    function stop(){
      if(timer){
        window.clearInterval(timer);
        timer = null;
      }
    }

    dots.forEach(function(dot, i){
      dot.addEventListener('click', function(){
        show(i);
        start();
      });
    });

    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);

    var touchStartX = 0;
    var touchStartY = 0;
    hero.addEventListener('touchstart', function(event){
      if(!event.touches || !event.touches.length) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive:true });
    hero.addEventListener('touchend', function(event){
      if(!event.changedTouches || !event.changedTouches.length) return;
      var dx = event.changedTouches[0].clientX - touchStartX;
      var dy = event.changedTouches[0].clientY - touchStartY;
      if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4){
        show(current + (dx < 0 ? 1 : -1));
        start();
      }
    }, { passive:true });

    show(current);
    start();
  }


  function initDedicatedMobileHeroSlider(){
    var hero = qs('.mobile-hero-only');
    if(!hero) return;
    var slides = qsa('.mobile-hero-slide', hero);
    var dots = qsa('.mobile-hero-dot', hero);
    if(!slides.length) return;
    var current = slides.findIndex(function(slide){ return slide.classList.contains('is-active'); });
    if(current < 0) current = 0;
    var timer = null;
    var delay = 5600;
    function show(index){
      current = (index + slides.length) % slides.length;
      slides.forEach(function(slide, i){ slide.classList.toggle('is-active', i === current); });
      dots.forEach(function(dot, i){ dot.classList.toggle('is-active', i === current); });
    }
    function start(){
      stop();
      timer = window.setInterval(function(){ show(current + 1); }, delay);
    }
    function stop(){
      if(timer){ window.clearInterval(timer); timer = null; }
    }
    dots.forEach(function(dot, i){
      dot.addEventListener('click', function(){ show(i); start(); });
    });
    var touchStartX = 0, touchStartY = 0;
    hero.addEventListener('touchstart', function(event){
      if(!event.touches || !event.touches.length) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive:true });
    hero.addEventListener('touchend', function(event){
      if(!event.changedTouches || !event.changedTouches.length) return;
      var dx = event.changedTouches[0].clientX - touchStartX;
      var dy = event.changedTouches[0].clientY - touchStartY;
      if(Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4){
        show(current + (dx < 0 ? 1 : -1));
        start();
      }
    }, { passive:true });
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    show(current);
    start();
  }

  function initMobileHeroFloatingRule(){
    function apply(){
      var mq = window.matchMedia('(max-width: 760px)');
      var hero = qs('.mobile-hero-only, .hero, .hero-slider, .home-hero, .banner, .slide, .page-hero');
      var floating = qs('.floating');
      if(!mq.matches || !hero || !floating){
        document.body.classList.remove('mobile-hero-visible');
        return;
      }
      if(!('IntersectionObserver' in window)){
        document.body.classList.remove('mobile-hero-visible');
        return;
      }
      if(window.__pfdMobileHeroObserver){ window.__pfdMobileHeroObserver.disconnect(); }
      window.__pfdMobileHeroObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting && entry.intersectionRatio > 0.08){
            document.body.classList.add('mobile-hero-visible');
          }else{
            document.body.classList.remove('mobile-hero-visible');
          }
        });
      }, { threshold:[0,0.08,0.2], rootMargin:'0px 0px -30% 0px' });
      window.__pfdMobileHeroObserver.observe(hero);
    }
    apply();
    window.addEventListener('resize', apply);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ initSearch(); initHeroSlider(); initDedicatedMobileHeroSlider(); initMobileHeroFloatingRule(); });
  }else{
    initSearch();
    initHeroSlider();
    initDedicatedMobileHeroSlider();
    initMobileHeroFloatingRule();
  }
})();
