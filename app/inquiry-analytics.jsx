'use client';

import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { track } from '@vercel/analytics';

function cleanPagePath() {
  return window.location.pathname || '/';
}

function placementFor(element) {
  if (element.closest('.floating')) return 'floating_chat';
  if (element.closest('#rfqForm')) return 'rfq_form';
  if (element.closest('.rfq-box')) return 'rfq_box';
  if (element.closest('header')) return 'header';
  return 'page_content';
}

export default function InquiryAnalytics() {
  useEffect(() => {
    function onClick(event) {
      const element = event.target?.closest?.('a,button,input[type="submit"]');
      if (!element) return;
      const href = element.getAttribute('href') || '';
      const label = (element.textContent || element.getAttribute('aria-label') || '').toLowerCase();
      const context = `${href} ${label}`.toLowerCase();
      let channel = '';

      if (context.includes('wa.me') || context.includes('whatsapp')) channel = 'whatsapp';
      else if (href.startsWith('mailto:') || label.includes('email')) channel = 'email';
      else if (context.includes('quote') || context.includes('rfq') || context.includes('request')) channel = 'rfq';
      if (!channel) return;

      track('inquiry_intent', {
        channel,
        page: cleanPagePath(),
        placement: placementFor(element)
      });
    }

    function onSubmit(event) {
      if (!event.target?.matches?.('#rfqForm')) return;
      track('rfq_form_submit', {
        page: cleanPagePath(),
        placement: 'rfq_form'
      });
    }

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url);
          url.search = '';
          url.hash = '';
          return { ...event, url: url.toString() };
        } catch {
          return event;
        }
      }}
    />
  );
}
