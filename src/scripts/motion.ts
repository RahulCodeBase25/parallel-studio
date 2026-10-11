import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText)

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let lenis: Lenis | null = null
let ctx: gsap.Context | null = null

// Smooth scrolling lives for the whole visit; page-specific animations are
// rebuilt after every client-side navigation and torn down before the next.
function startLenis() {
  if (lenis || reduced()) return
  lenis = new Lenis({ lerp: 0.11, anchors: { offset: -40 } })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis?.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

function cursor() {
  const el = document.querySelector<HTMLElement>('.cursor')
  const dot = el?.querySelector('span')
  if (!el || !dot || matchMedia('(hover: none)').matches) return
  const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' })
  const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' })
  addEventListener('pointermove', e => { x(e.clientX); y(e.clientY) }, { passive: true })
  document.addEventListener('pointerover', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]')
    document.documentElement.classList.toggle('cursor-label', !!target)
    dot.textContent = target?.dataset.cursor ?? ''
  })
}

function clock() {
  const tick = () => document.querySelectorAll('[data-clock]').forEach((n) => {
    n.textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date())
  })
  tick()
  setInterval(tick, 30_000)
}

function page() {
  ctx?.revert()
  ctx = gsap.context(() => {
    if (reduced()) return

    // 1. The one orchestrated moment: the hero headline arrives line by line,
    //    each line starting compressed and stretching out to full width.
    const hero = document.querySelector<HTMLElement>('[data-hero-title]')
    if (hero) {
      const split = SplitText.create(hero, { type: 'lines', mask: 'lines' })
      gsap.from(split.lines, { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09, delay: 0.25 })
      gsap.fromTo(hero, { fontStretch: '60%' }, { fontStretch: '112%', duration: 1.6, ease: 'power3.out', delay: 0.25 })
      gsap.from('[data-hero-fade]', { opacity: 0, y: 12, duration: 0.8, delay: 1.1, stagger: 0.08 })
    }

    // 2. Big headings stretch as they cross the middle of the screen
    gsap.utils.toArray<HTMLElement>('[data-scrub-stretch]').forEach((el) => {
      gsap.fromTo(el, { fontStretch: '62%' }, {
        fontStretch: '125%', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true },
      })
    })

    // 3. Process: the section pins and the steps slide sideways as you scroll
    const track = document.querySelector<HTMLElement>('[data-process-track]')
    const section = document.querySelector<HTMLElement>('[data-process]')
    if (track && section && matchMedia('(min-width: 900px)').matches) {
      const distance = () => track.scrollWidth - innerWidth
      gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
      })
      gsap.to('[data-process-bar]', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true },
      })
    }

    // 4. Numbers count up once when they come into view
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count)
      const obj = { v: 0 }
      gsap.to(obj, {
        v: to, duration: 1.4, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.v).toString() },
      })
    })
  })
  ScrollTrigger.refresh()
}

// The nav sits on top of everything; it switches to white text whenever the
// section underneath it is dark.
function navTone() {
  const nav = document.querySelector<HTMLElement>('.nav')
  if (!nav) return
  const y = nav.offsetHeight / 2
  const under = document.elementsFromPoint(innerWidth / 2, y).find(el => !nav.contains(el))
  nav.dataset.on = under?.closest('[data-surface="dark"]') ? 'dark' : 'light'
}

let booted = false
export function boot() {
  if (booted) return
  booted = true
  startLenis()
  cursor()
  clock()
  addEventListener('scroll', navTone, { passive: true })
  document.addEventListener('astro:page-load', () => {
    page()
    navTone()
    const target = location.hash && document.querySelector(location.hash)
    if (target) requestAnimationFrame(() => lenis ? lenis.scrollTo(target as HTMLElement, { offset: -40, immediate: true }) : target.scrollIntoView())
    else lenis?.scrollTo(0, { immediate: true })
    document.documentElement.classList.remove('cursor-label')
  })
  document.addEventListener('astro:before-swap', () => { ctx?.revert(); ctx = null })
}
