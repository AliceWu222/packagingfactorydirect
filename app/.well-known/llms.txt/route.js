export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

// .well-known/llms.txt is the discovery-path alias of /llms.txt.
// AI crawlers and LLM tools often probe this location first.
export { GET } from '../../llms.txt/route';
