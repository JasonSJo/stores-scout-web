import Link from '@/lib/link';
import { ArrowUpRight, ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return <div className="site-home">
    <header className="site-header"><Link href="/" className="brand" aria-label="스스닷컴 홈"><span className="brand-mark"><span className="brand-monogram" aria-hidden="true">스스</span></span><strong>스스닷컴<span>stores scout</span></strong></Link><nav aria-label="주요 메뉴"><Link className="nav-cta" href="/consultation"><Sparkles size={14}/> 상권분석 시작</Link></nav><span className="header-label">FOR FRANCHISE TEAMS <ArrowUpRight size={14}/></span></header>
    <main>
      <section className="hero">
        <div className="hero-eyebrow"><span/> 좋은 매장의 시작, 정확한 상권에서</div>
        <h1>가능성을 찾고,<br/><em>확신으로 출점하세요.</em></h1>
        <p className="hero-description">고객의 창업 조건부터 상권의 가능성까지.<br/>프랜차이즈 출점의 모든 판단을, 스스닷컴에서.</p>
        <Button className="hero-cta" nativeButton={false} render={<Link href="/consultation"/>}>상권분석하기 <ArrowRight size={20}/></Button>
        <p className="hero-note"><ClipboardList size={14}/> 고객 상담 정보 입력부터 시작합니다</p>
      </section>
      <section className="hero-proof" aria-label="서비스 범위"><span>전국 행정동 기준</span><i aria-hidden="true"/><span>상권·부동산 데이터</span><i aria-hidden="true"/><span>프랜차이즈 출점 검토</span></section>
    </main><footer><Link href="/" className="footer-brand">스스닷컴 <span>stores-scout.com</span></Link><span>© 2026 STORES SCOUT. All rights reserved.</span><span>좋은 입지의 시작.</span></footer>
  </div>;
}
