import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const motionAllowed = '(prefers-reduced-motion: no-preference)';

export function useShopMotion(scope, categories, featured) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add(motionAllowed, () => {
      const hero = scope.current.querySelector('.hero');
      const stage = hero.querySelector('.mate-scene__stage');
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro.from(hero.querySelectorAll('.hero__line > *'), { yPercent: 72, rotation: 2, stagger: 0.13, duration: 0.85, clearProps: 'transform' })
        .from(hero.querySelectorAll('[data-intro]'), { y: 22, stagger: 0.09, duration: 0.65, clearProps: 'transform' }, 0.12)
        .from(hero.querySelector('.mate-scene__portrait'), { y: 44, rotation: -15, scale: 0.82, duration: 1.15, ease: 'back.out(1.2)', clearProps: 'transform' }, 0);

      gsap.fromTo(stage, { yPercent: 0, rotation: 0 }, {
        yPercent: 10, rotation: 7, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.45 },
      });
      scope.current.querySelectorAll('[data-reveal] .section-heading, .benefits article').forEach((item) => {
        gsap.from(item, { x: -26, duration: 0.7, ease: 'power3.out', clearProps: 'transform',
          scrollTrigger: { trigger: item, start: 'top 94%', once: true } });
      });
    });
    media.add(motionAllowed + ' and (hover: hover) and (pointer: fine)', () => {
      const figure = scope.current.querySelector('.mate-scene');
      const image = figure.querySelector('.mate-scene__fallback');
      const moveX = gsap.quickTo(image, 'x', { duration: 0.45, ease: 'power3.out' });
      const tilt = gsap.quickTo(image, 'rotation', { duration: 0.55, ease: 'power3.out' });
      const move = (event) => {
        const rect = figure.getBoundingClientRect();
        const offset = (event.clientX - rect.left) / rect.width - 0.5;
        moveX(offset * 36);
        tilt(offset * 14);
      };
      const reset = () => { moveX(0); tilt(0); };
      figure.addEventListener('pointermove', move);
      figure.addEventListener('pointerleave', reset);
      return () => {
        figure.removeEventListener('pointermove', move);
        figure.removeEventListener('pointerleave', reset);
      };
    });
    return () => media.revert();
  }, { scope });

  useCollectionReveal(scope, '.category-cards', categories);
  useCollectionReveal(scope, '.product-grid', featured);
}

function useCollectionReveal(scope, selector, data) {
  useGSAP(() => {
    const group = scope.current.querySelector(selector);
    if (!group?.children.length) return;
    const media = gsap.matchMedia();
    media.add(motionAllowed, () => {
      gsap.from(group.children, {
        y: 40, opacity: 0.35, duration: 0.75,
        stagger: { amount: Math.min((group.children.length - 1) * 0.09, 0.45) },
        ease: 'power3.out', clearProps: 'transform,opacity',
        scrollTrigger: { trigger: group, start: 'top 96%', once: true },
      });
      ScrollTrigger.refresh();
    });
    return () => media.revert();
  }, { scope, dependencies: [selector, data], revertOnUpdate: true });
}
