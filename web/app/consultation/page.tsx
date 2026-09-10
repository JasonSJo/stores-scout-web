'use client';

import Link from '@/lib/link';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  MapPin,
  Wallet,
  Store,
  Search,
  Check,
  ShieldCheck,
  ClipboardCheck,
  Download,
  Info,
  Building2,
  BriefcaseBusiness,
  GraduationCap,
  Hospital,
  Landmark,
  Layers3,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { REGIONS } from '@/lib/regions';
import { getLowerRegions } from '@/lib/lower-regions';
import { formatKoreanPhone } from '@/lib/phone';
import { PropertyMap, type MapPoint } from '@/components/property-map';

type Address = { zip: string; main: string; detail: string };
type Area = { city: string; district: string; subdistrict: string };
type Consultation = {
  name: string;
  phone: string;
  home: Area;
  work: Address;
  areas: Area[];
  size: string;
  market: string[];
  deposit: string;
  premium: string;
  saleBudget: string;
  monthlyRentMax: string;
  funding: string;
  operation: string;
};
type PostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
};
declare global {
  interface Window {
    kakao?: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeData) => void;
        width: string;
        height: string;
      }) => { embed: (element: HTMLElement) => void };
    };
  }
}
const initial: Consultation = {
  name: '',
  phone: '',
  home: { city: '', district: '', subdistrict: '' },
  work: { zip: '', main: '', detail: '' },
  areas: [
    { city: '', district: '', subdistrict: '' },
    { city: '', district: '', subdistrict: '' },
    { city: '', district: '', subdistrict: '' },
  ],
  size: '',
  market: [],
  deposit: '',
  premium: '',
  saleBudget: '',
  monthlyRentMax: '',
  funding: '',
  operation: '',
};
const markets = [
  { name: '오피스', icon: BriefcaseBusiness },
  { name: '주거', icon: Building2 },
  { name: '학교', icon: GraduationCap },
  { name: '병원', icon: Hospital },
  { name: '메인', icon: Landmark },
  { name: '복합', icon: Layers3 },
];
const money = (value: string) =>
  value === '' ? '미입력' : Number(value).toLocaleString('ko-KR') + '만 원';

type Listing = {
  id: string;
  title: string;
  address: string;
  kind: '임대' | '매매';
  area: number;
  areaUnit: '㎡' | '평';
  deposit: number;
  rent: number;
  premium: number;
  latitude: number;
  longitude: number;
  sourceUrl: string;
};

// 네모에서 전달받은 테스트 실매물입니다. 좌표는 주소 기준 지도 표시용이며,
// 실시간 매물 공급처 연동 전에는 이 한 건만 결과 목록에 노출합니다.
const TEST_LISTINGS: Listing[] = [
  {
    id: 'nemo-921744',
    title: '부산진구 당감로 98 · 1층 상가',
    address: '부산광역시 부산진구 당감로 98',
    kind: '임대',
    area: 29.75,
    areaUnit: '㎡',
    deposit: 1500,
    rent: 130,
    premium: 5000,
    // 카카오 주소 검색(당감로 98)으로 확인한 도로명 주소 좌표
    latitude: 35.1703238168666,
    longitude: 129.03828426244,
    sourceUrl: 'https://www.nemoapp.kr/share/store/921744',
  },
];

export default function ConsultationPage() {
  const [form, setForm] = useState<Consultation>(initial);
  const [addressTarget, setAddressTarget] = useState<'work' | null>(null);
  const [addressError, setAddressError] = useState('');
  const [complete, setComplete] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const postcodeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const update = (key: keyof Consultation, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };
  const setWorkAddress = (part: keyof Address, value: string) =>
    setForm((prev) => ({
      ...prev,
      work: { ...prev.work, [part]: value },
    }));
  const filled = [
    Boolean(
      form.name.trim() &&
        form.phone.trim() &&
        form.home.district &&
        (!getLowerRegions(form.home.city, form.home.district).length ||
          form.home.subdistrict) &&
        form.work.main,
    ),
    Boolean(
      form.areas[0].district &&
        (!getLowerRegions(form.areas[0].city, form.areas[0].district).length ||
          form.areas[0].subdistrict) &&
        form.size &&
        form.market.length,
    ),
    Boolean(form.deposit !== '' && form.premium !== '' && form.funding),
    Boolean(form.operation),
  ];
  const progress = filled.filter(Boolean).length;
  const total = Number(form.deposit || 0) + Number(form.premium || 0);
  const selectedProperty = TEST_LISTINGS.find((property) => property.id === selectedPropertyId) || null;
  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onerror = () =>
      setAddressError(
        '주소 검색 서비스를 불러오지 못했습니다. 주소를 직접 입력하거나 잠시 후 다시 시도해 주세요.',
      );
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);
  useEffect(() => {
    if (!addressTarget) return;
    let active = true;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts++;
      if (window.kakao?.Postcode && postcodeRef.current) {
        window.clearInterval(timer);
        setAddressError('');
        new window.kakao.Postcode({
          width: '100%',
          height: '100%',
          oncomplete(data) {
            if (!active) return;
            setForm((prev) => ({
              ...prev,
              work: {
                ...prev.work,
                zip: data.zonecode,
                main: data.roadAddress || data.jibunAddress,
              },
            }));
            setAddressTarget(null);
          },
        }).embed(postcodeRef.current);
      } else if (attempts > 50) {
        window.clearInterval(timer);
        setAddressError(
          '주소 검색을 연결할 수 없습니다. 창을 닫고 주소를 직접 입력해 주세요.',
        );
      }
    }, 150);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [addressTarget]);

  useEffect(() => {
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'get_consultation_preferences',
      title: '상담 조건 확인',
      description:
        '현재 입력된 창업 조건을 읽습니다. 고객 이름, 전화번호, 주소는 반환하지 않습니다.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => {
        const f = formRef.current;
        return {
          areas: f.areas,
          size: f.size,
          market: f.market,
          deposit: f.deposit,
          premium: f.premium,
          funding: f.funding,
          operation: f.operation,
        };
      },
    });
    register({
      name: 'stage_consultation_preferences',
      title: '창업 조건 입력',
      description:
        '상담 폼의 창업 조건을 입력합니다. 저장하거나 제출하지 않으며 사용자가 확인할 수 있도록 화면에 반영합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          size: { type: 'string' },
          market: {
            type: 'array',
            items: { type: 'string', enum: markets.map((m) => m.name) },
            minItems: 1,
            maxItems: markets.length,
            uniqueItems: true,
          },
          funding: {
            type: 'string',
            enum: ['현금', '현금+대출', '현금+대출+리스'],
          },
          operation: { type: 'string', enum: ['오토', '점주+알바', '점주'] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw new Error('입력은 객체여야 합니다.');
        const patch = input as Record<string, unknown>;
        const allowed: Record<string, string[]> = {
          funding: ['현금', '현금+대출', '현금+대출+리스'],
          operation: ['오토', '점주+알바', '점주'],
        };
        for (const [key, value] of Object.entries(patch)) {
          if (key === 'market') {
            const marketNames = markets.map((m) => m.name);
            if (
              !Array.isArray(value) ||
              value.length < 1 ||
              value.length > marketNames.length ||
              new Set(value).size !== value.length ||
              !value.every((item) =>
                typeof item === 'string' && marketNames.includes(item),
              )
            )
              throw new Error('올바르지 않은 희망 상권입니다.');
            continue;
          }
          if (
            typeof value !== 'string' ||
            !(key === 'size' || key in allowed) ||
            (key === 'size'
              ? !/^\d+(\.\d+)?$/.test(value) ||
                Number(value) <= 0 ||
                Number(value) > 100000
              : !allowed[key].includes(value))
          )
            throw new Error('올바르지 않은 창업 조건입니다.');
        }
        flushSync(() => setForm((prev) => ({ ...prev, ...patch })));
        return { status: 'staged', fields: Object.keys(patch) };
      },
    });
    return () => lifecycle.abort();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^0\d{8,10}$/.test(form.phone.replace(/\D/g, ''))) {
      setError('전화번호를 확인해 주세요. 숫자 9~11자리로 입력해 주세요.');
      document.getElementById('phone')?.focus();
      return;
    }
    if (!form.market.length || !form.funding || !form.operation) {
      setError('희망 상권, 투자금 형태, 운영 형태를 모두 선택해 주세요.');
      return;
    }
    if (
      form.home.district &&
      getLowerRegions(form.home.city, form.home.district).length &&
      !form.home.subdistrict
    ) {
      setError('거주지의 구·읍·면까지 선택해 주세요.');
      return;
    }
    const areas = form.areas.filter(
      (a) => a.city || a.district || a.subdistrict,
    );
    if (areas.some((a) => !a.city || !a.district)) {
      setError('선택한 희망 지역의 시·군·구를 끝까지 선택해 주세요.');
      return;
    }
    if (
      areas.some(
        (a) => getLowerRegions(a.city, a.district).length && !a.subdistrict,
      )
    ) {
      setError('해당 지역의 구·읍·면까지 선택해 주세요.');
      return;
    }
    if (
      new Set(areas.map((a) => a.city + a.district + a.subdistrict)).size !==
      areas.length
    ) {
      setError('희망 지역은 순위별로 서로 다른 지역을 선택해 주세요.');
      return;
    }
    setComplete(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // 상담 파일은 둘로 가른다.
  //
  //   상담카드.csv — 고객명·전화번호·거주지·근무지가 들어 있다. 상담사가 보관한다.
  //   조건.csv     — 개인정보가 없다. 파이프라인(analysis/consult.py)이 읽는 키만 담는다.
  //
  // 한 파일로 내려주면 그 파일이 그대로 파이프라인에 들어가고, 그때 고객 연락처가
  // 심의 자료로 넘어간다. 파이프라인이 읽는 키만 골라 쓰긴 하지만 — 애초에
  // 들어가지 않는 것과, 들어갔다가 걸러지는 것은 다르다.
  //
  // 키 이름은 analysis/consult.py 의 읽는키 와 글자 그대로 같아야 한다.
  // 다르면 파이프라인이 조용히 빈 값으로 읽고 필터가 아무것도 거르지 않는다.

  function csvCell(value: string) {
    // 쉼표·따옴표·줄바꿈이 든 칸만 감싼다. 감싼 칸 안의 따옴표는 겹따옴표로 쓴다.
    return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  }
  function csv(rows: string[][]) {
    // 맨 앞의 \ufeff 는 엑셀이 UTF-8 로 읽게 하는 표식이다. 없으면 한글이 깨진다.
    // 줄 끝은 CRLF — 엑셀이 그것을 기대한다.
    return '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  function save(name: string, text: string) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function 주소(a: Address) {
    return [a.main, a.detail].filter(Boolean).join(' ');
  }
  function 지역(a: Area) {
    return [a.city, a.district, a.subdistrict].filter(Boolean).join(' ');
  }
  function 희망지역() {
    return form.areas.filter((a) => a.city && a.district)
      .map(지역);
  }
  function 스탬프() {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`;
  }

  function 상담카드내려받기() {
    const 선호지역 = 희망지역();
    save(
      `상담카드_${form.name || '무명'}_${스탬프()}.csv`,
      csv([
        ['항목', '값'],
        ['작성시각', new Date().toISOString()],
        ['고객명', form.name],
        ['고객전화번호', form.phone],
        ['거주지', 지역(form.home)],
        ['근무지', 주소(form.work)],
        ...선호지역.map((a, i) => [`희망지역_${i + 1}순위`, a]),
        ['희망평수', form.size],
        ['희망상권', form.market.join('·')],
        ['보증금_만원', form.deposit],
        ['권리금_만원', form.premium],
        ['매매총예산_만원', form.saleBudget],
        ['월세상한_만원', form.monthlyRentMax],
        ['투자금형태', form.funding],
        ['운영형태', form.operation],
      ]),
    );
  }

  function 조건내려받기() {
    // 이 파일 이름에는 고객명을 넣지 않는다 — 파일 이름도 개인정보다.
    // 열 이름·차례는 analysis/consult.py 의 읽는키 그대로다.
    // 목록 칸(희망지역·희망상권)은 · 로 잇는다 — 파이프라인이 목록을 찍을 때 쓰는 구분자다.
    save(
      `조건_${스탬프()}.csv`,
      csv([
        ['희망평수', '희망상권', '희망지역', '보증금_만원', '권리금_만원',
          '투자금형태', '운영형태'],
        [form.size, form.market.join('·'), 희망지역().join('·'), form.deposit,
          form.premium, form.funding, form.operation],
      ]),
    );
  }

  function download() {
    상담카드내려받기();
    // 브라우저가 연속된 두 개의 내려받기를 하나로 묶어 막는 일이 있다 — 사이를 띄운다.
    setTimeout(조건내려받기, 400);
  }

  function renderResidenceFields() {
    return (
      <div className="field address-field residence-field">
        <Label htmlFor="home-city">
          거주지 <span className="required">*</span>
        </Label>
        <div
          className={`address-region-row ${getLowerRegions(form.home.city, form.home.district).length ? 'has-subdistrict' : ''}`}
        >
          <NativeSelect
            id="home-city"
            aria-label="거주지 시·도"
            value={form.home.city}
            required
            onChange={(event) =>
              update('home', {
                city: event.target.value,
                district: '',
                subdistrict: '',
              })
            }
          >
            <option value="">시·도 선택</option>
            {Object.keys(REGIONS).map((city) => (
              <option key={city}>{city}</option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="거주지 시·군·구"
            value={form.home.district}
            disabled={!form.home.city}
            required
            onChange={(event) =>
              update('home', {
                ...form.home,
                district: event.target.value,
                subdistrict: '',
              })
            }
          >
            <option value="">시·군·구 선택</option>
            {(REGIONS[form.home.city] || []).map((district) => (
              <option key={district}>{district}</option>
            ))}
          </NativeSelect>
          {getLowerRegions(form.home.city, form.home.district).length ? (
            <NativeSelect
              className="subdistrict-select"
              aria-label="거주지 구·읍·면"
              value={form.home.subdistrict}
              required
              onChange={(event) =>
                update('home', {
                  ...form.home,
                  subdistrict: event.target.value,
                })
              }
            >
              <option value="">구·읍·면 선택</option>
              {getLowerRegions(form.home.city, form.home.district).map((subdistrict) => (
                <option key={subdistrict}>{subdistrict}</option>
              ))}
            </NativeSelect>
          ) : null}
        </div>
      </div>
    );
  }

  function renderWorkAddressFields() {
    return (
      <div className="field address-field">
        <Label htmlFor="work-address">
          근무지 <span className="required">*</span>
        </Label>
        <div className="address-row">
          <Input
            aria-label="근무지 우편번호"
            placeholder="우편번호"
            value={form.work.zip}
            onChange={(e) => setWorkAddress('zip', e.target.value)}
            maxLength={5}
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddressTarget('work')}
          >
            <Search size={15} /> 주소 검색
          </Button>
        </div>
        <Input
          id="work-address"
          placeholder="도로명 또는 지번 주소"
          value={form.work.main}
          onChange={(e) => setWorkAddress('main', e.target.value)}
          required
        />
        <Input
          aria-label="근무지 상세주소"
          placeholder="상세주소 (선택)"
          value={form.work.detail}
          onChange={(e) => setWorkAddress('detail', e.target.value)}
        />
      </div>
    );
  }
  if (complete && selectedProperty)
    return (
      <div className="workspace-page property-review">
        <header className="tool-header result-header">
          <Link href="/" className="brand">
            <span className="brand-mark"><span className="brand-monogram">스스</span></span>
            <strong>스스닷컴<span>stores scout</span></strong>
          </Link>
          <nav className="tool-nav" aria-label="주요 메뉴"><Link href="/">홈</Link><Link href="/consultation" aria-current="page">상권분석</Link></nav>
          <Button variant="outline" onClick={() => setSelectedPropertyId(null)}>
            <ArrowLeft size={16} /> 매물 목록
          </Button>
        </header>
        <main className="property-review-main">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">PROPERTY · 선택 매물</span>
              <h1>{selectedProperty.title}</h1>
              <p>{selectedProperty.address} · {selectedProperty.kind} · {selectedProperty.area}{selectedProperty.areaUnit}</p>
            </div>
            <span className="example-badge">테스트 실매물 · 네모</span>
          </div>
          <section className="property-condition-summary">
            <div><h2>매물 조건</h2><p>보증금 {money(String(selectedProperty.deposit))}</p><p>월세 {selectedProperty.kind === '임대' ? money(String(selectedProperty.rent)) : '해당 없음'}</p></div>
            <div><h2>권리금 · 형태</h2><p>권리금 {money(String(selectedProperty.premium))}</p><p>{selectedProperty.kind} · {selectedProperty.area}{selectedProperty.areaUnit}</p></div>
            <div><h2>출처</h2><p><a href={selectedProperty.sourceUrl} target="_blank" rel="noreferrer">네모 테스트 매물 원문</a></p><p>지도 좌표는 카카오 주소 검색 결과입니다. 주소와 실제 위치를 함께 확인하세요.</p></div>
          </section>
          <section className="workspace-card" aria-labelledby="detail-map-title"><h2 id="detail-map-title">선택 매물 위치</h2><PropertyMap points={TEST_LISTINGS.map((property) => ({ id: property.id, latitude: property.latitude, longitude: property.longitude, label: property.title }))} selected={selectedProperty.id} /></section>
        </main>
      </div>
    );
  if (complete)
    return (
      <div className="workspace-page property-review">
        <header className="tool-header result-header">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <span className="brand-monogram">스스</span>
            </span>
            <strong>
              스스닷컴<span>stores scout</span>
            </strong>
          </Link>
          <nav className="tool-nav" aria-label="주요 메뉴"><Link href="/">홈</Link><Link href="/consultation" aria-current="page">상권분석</Link></nav>
          <Button variant="outline" onClick={() => setComplete(false)}>
            <ArrowLeft size={16} /> 상담 조건 수정
          </Button>
        </header>
        <main className="property-review-main">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">CONSULTATION · PROPERTY MATCH</span>
              <h1>{form.name} 고객님의 조건별 매물</h1>
              <p>
                입력하신 조건을 정리했습니다. 아래에서 상담 파일로 내려받으실 수
                있습니다.
              </p>
            </div>
          </div>
          <section className="property-condition-summary">
            <div>
              <h2>희망 지역</h2>
              {form.areas
                .filter((a) => a.district)
                .map((a, i) => (
                  <p key={i}>
                    {i + 1}순위 · {지역(a)}
                  </p>
                ))}
            </div>
            <div>
              <h2>면적·상권</h2>
              <p>
                전용 {form.size}평 · {form.market.join(' · ')}
              </p>
              <p>
                {form.operation} · {form.funding}
              </p>
            </div>
            <div>
              <h2>가격 상한</h2>
              <p>매매 총예산 {money(form.saleBudget)}</p>
              <p>
                임대 보증금 {money(form.deposit)} / 권리금 {money(form.premium)}{' '}
                / 월세 {money(form.monthlyRentMax)}
              </p>
            </div>
          </section>
          <section className="workspace-card property-results" aria-labelledby="property-results-title">
            <div className="card-title-row"><div><h2 id="property-results-title">조건에 맞는 매물</h2><p className="muted-copy">네모에서 전달받은 테스트 실매물입니다. 매물을 선택하면 조건과 위치를 자세히 볼 수 있습니다.</p></div><span className="example-badge">테스트 실매물 · 네모</span></div>
            <div className="property-layout">
              <div className="property-map-wrap"><PropertyMap points={TEST_LISTINGS.map((property) => ({ id: property.id, latitude: property.latitude, longitude: property.longitude, label: property.title }))} selected={selectedPropertyId} onSelect={setSelectedPropertyId} /></div>
              <div className="property-list" aria-label="조건별 매물 목록">{TEST_LISTINGS.map((property) => <button type="button" className={`property-card ${selectedPropertyId === property.id ? 'selected' : ''}`} key={property.id} onClick={() => setSelectedPropertyId(property.id)}><span className="property-card-kicker">{property.kind} · {property.area}{property.areaUnit}</span><h3>{property.title}</h3><p>{property.address}</p><p className="property-price">보증금 {money(String(property.deposit))} / 월세 {money(String(property.rent))} / 권리금 {money(String(property.premium))}</p><span className="property-card-action">상세 분석 보기 <ArrowRight size={15} /></span></button>)}</div>
            </div>
            <p className="analysis-disclaimer">출처: <a href={TEST_LISTINGS[0].sourceUrl} target="_blank" rel="noreferrer">네모 테스트 매물 원문</a> · 지도 좌표는 카카오 주소 검색 결과이며, 정식 매물 API 연결 시 공급처 좌표로 교체됩니다.</p>
          </section>
          <details className="workspace-card property-save">
            <summary>상담 내용 확인·저장·내려받기</summary>
            <dl className="complete-summary">
              <dt>고객</dt>
              <dd>
                {form.name} · {form.phone}
              </dd>
              <dt>거주지</dt>
              <dd>{지역(form.home)}</dd>
              <dt>근무지</dt>
              <dd>
                {form.work.main} {form.work.detail}
              </dd>
            </dl>
            <p>
              입력하신 값은 서버로 나가지 않습니다. 내려받은 파일이 유일한 기록입니다.
            </p>
            {/* 파일을 둘로 가른 이유를 화면에도 적는다. 적지 않으면 상담사가
                둘 중 아무거나 넘기게 되고, 가른 것이 무의미해진다. */}
            <dl className="download-guide">
              <dt>상담카드</dt>
              <dd>
                고객명·전화번호·거주지·근무지가 들어 있습니다.{' '}
                <b>상담사가 보관하고, 분석에는 넘기지 않습니다.</b>
              </dd>
              <dt>조건</dt>
              <dd>
                개인정보가 없습니다. 평수·상권·지역·투자금·운영형태만 담겨 있어{' '}
                <b>이 파일만 분석에 넘깁니다.</b>
              </dd>
            </dl>
            <div className="download-row">
              <Button variant="outline" onClick={상담카드내려받기}>
                <Download size={16} /> 상담카드 CSV
              </Button>
              <Button variant="outline" onClick={조건내려받기}>
                <Download size={16} /> 조건 CSV
              </Button>
              <Button variant="outline" onClick={download}>
                <Download size={16} /> 둘 다
              </Button>
            </div>
          </details>
        </main>
      </div>
    );
  return (
    <div className="tool-page">
      <header className="tool-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <span className="brand-monogram" aria-hidden="true">
              스스
            </span>
          </span>
          <strong>
            스스닷컴<span>stores scout</span>
          </strong>
        </Link>
        <nav className="tool-nav" aria-label="주요 메뉴"><Link href="/">홈</Link><Link href="/consultation" aria-current="page">상권분석</Link></nav>
        <span className="tool-name">상권분석 도구</span>
        {/* /workspace 는 서버가 있어야 하는 화면이다. 이 배포에는 없다 —
            없는 곳으로 보내는 링크를 두면 404 가 난다. 메인으로 돌린다. */}
        <Link href="/" className="back-home">
          <ArrowLeft size={15} /> 메인으로
        </Link>
      </header>
      <div className="tool-layout">
        <aside className="tool-sidebar">
          <span className="eyebrow">NEW CONSULTATION</span>
          <h2>
            좋은 출점의
            <br />첫 번째 단계.
          </h2>
          <p>
            고객의 조건을 정리하면
            <br />
            상권의 방향이 보입니다.
          </p>
          <nav className="form-steps">
            {[
              ['basic', '고객 기본 정보', UserRound],
              ['location', '창업 희망 조건', MapPin],
              ['budget', '투자 계획', Wallet],
              ['operation', '운영 계획', Store],
            ].map(([id, title, Icon], i) => {
              const StepIcon = Icon as typeof UserRound;
              return (
                <a
                  key={String(id)}
                  href={`#${id}`}
                  className={filled[i] ? 'done' : ''}
                >
                  <span className="step-icon">
                    {filled[i] ? <Check size={15} /> : <StepIcon size={16} />}
                  </span>
                  <span>{String(title)}</span>
                  <small>0{i + 1}</small>
                </a>
              );
            })}
          </nav>
          <div className="sidebar-tip">
            <ShieldCheck size={20} />
            <h3>상담 정보는 안전하게</h3>
            <p>
              입력하신 내용은 이 브라우저 안에만 있습니다. 서버로 보내지 않고,
              페이지를 벗어나면 지워집니다. 남기시려면 상담 파일로 내려받으십시오.
            </p>
          </div>
          <span className="sidebar-domain">stores-scout.com</span>
        </aside>
        <main className="consultation-main">
          <div className="breadcrumb">
            <Link href="/">홈</Link>
            <ChevronRight size={12} />
            <span>상권분석</span>
            <ChevronRight size={12} />
            <b>고객 상담</b>
          </div>
          <div className="form-heading">
            <div>
              <span className="eyebrow">STEP 01 · CLIENT CONSULTATION</span>
              <h1>고객 상담</h1>
              <p>고객에게 맞는 상권을 찾기 위해 창업 조건을 입력해 주세요.</p>
            </div>
            <span className="required-guide">
              <i /> 필수 입력 항목
            </span>
          </div>
          <form onSubmit={submit}>
            <section className="form-section" id="basic">
              <div className="form-section-title">
                <span>01</span>
                <h2>고객 기본 정보</h2>
                <small>상담 고객의 기본 정보를 입력해 주세요.</small>
              </div>
              <div className="field-grid">
                <div className="field">
                  <Label htmlFor="customer-name">
                    고객명 <span className="required">*</span>
                  </Label>
                  <Input
                    id="customer-name"
                    autoComplete="name"
                    placeholder="고객 이름을 입력해 주세요"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    maxLength={60}
                  />
                </div>
                <div className="field">
                  <Label htmlFor="phone">
                    고객 전화번호 <span className="required">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="010-0000-0000"
                    value={form.phone}
                    inputMode="numeric"
                    onChange={(e) => update('phone', formatKoreanPhone(e.target.value))}
                    required
                    maxLength={14}
                  />
                </div>
                {renderResidenceFields()}
                {renderWorkAddressFields()}
              </div>
              <p className="field-help">
                <Info size={13} /> 거주지는 시·도, 시·군·구를 선택하고,
                해당 지역에 구·읍·면이 있으면 한 단계 더 선택합니다. 근무지는 주소 검색을
                이용해 입력할 수 있습니다.
              </p>
            </section>
            <section className="form-section" id="location">
              <div className="form-section-title">
                <span>02</span>
                <h2>창업 희망 조건</h2>
                <small>어떤 지역과 상권을 찾고 계신가요?</small>
              </div>
              <Label className="group-label">
                창업 희망 지역 <span className="required">*</span>
                <small>시·도 / 시·군·구 / 구·읍·면 · 1순위 필수</small>
              </Label>
              <div className="regions-list">
                {form.areas.map((area, i) => (
                  <div
                    className={`region-row ${getLowerRegions(area.city, area.district).length ? 'has-subdistrict' : ''}`}
                    key={i}
                  >
                    <span className={`rank rank-${i}`}>
                      {i + 1}
                      <small>순위</small>
                    </span>
                    <NativeSelect
                      aria-label={`${i + 1}순위 시·도`}
                      value={area.city}
                      required={i === 0}
                      onChange={(e) => {
                        const next = [...form.areas];
                        next[i] = {
                          city: e.target.value,
                          district: '',
                          subdistrict: '',
                        };
                        update('areas', next);
                      }}
                    >
                      <option value="">시·도 선택</option>
                      {Object.keys(REGIONS).map((city) => (
                        <option key={city}>{city}</option>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      aria-label={`${i + 1}순위 시·군·구`}
                      value={area.district}
                      disabled={!area.city}
                      required={i === 0 || Boolean(area.city)}
                      onChange={(e) => {
                        const next = [...form.areas];
                        next[i] = {
                          ...area,
                          district: e.target.value,
                          subdistrict: '',
                        };
                        update('areas', next);
                      }}
                    >
                      <option value="">시·군·구 선택</option>
                      {(REGIONS[area.city] || []).map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </NativeSelect>
                    {getLowerRegions(area.city, area.district).length ? (
                      <NativeSelect
                        className="subdistrict-select"
                        aria-label={`${i + 1}순위 구·읍·면`}
                        value={area.subdistrict}
                        required
                        onChange={(e) => {
                          const next = [...form.areas];
                          next[i] = {
                            ...area,
                            subdistrict: e.target.value,
                          };
                          update('areas', next);
                        }}
                      >
                        <option value="">구·읍·면 선택</option>
                        {getLowerRegions(area.city, area.district).map((subdistrict) => (
                          <option key={subdistrict}>{subdistrict}</option>
                        ))}
                      </NativeSelect>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="field size-field">
                <Label htmlFor="size">
                  희망 평수 <span className="required">*</span>
                </Label>
                <div className="unit-input">
                  <Input
                    id="size"
                    type="number"
                    min="1"
                    max="100000"
                    step="0.1"
                    placeholder="예: 30"
                    value={form.size}
                    onChange={(e) => update('size', e.target.value)}
                    required
                  />
                  <span>평</span>
                </div>
                <small>
                  {form.size
                    ? `약 ${(Number(form.size) * 3.3058).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}㎡`
                    : '전용면적 기준으로 입력해 주세요.'}
                </small>
              </div>
              <fieldset>
                <legend>
                  희망 상권 <span className="required">*</span>
                  <small>복수 선택 가능</small>
                </legend>
                <div
                  className="market-options"
                  role="group"
                  aria-label="희망 상권"
                >
                  {markets.map(({ name, icon: Icon }) => (
                    <Label
                      className={`market-option ${form.market.includes(name) ? 'selected' : ''}`}
                      key={name}
                    >
                      <Icon size={21} />
                      <span>{name}</span>
                      <input
                        type="checkbox"
                        value={name}
                        checked={form.market.includes(name)}
                        onChange={(event) =>
                          update(
                            'market',
                            event.target.checked
                              ? [...form.market, name]
                              : form.market.filter((market) => market !== name),
                          )
                        }
                        aria-label={`${name} 상권`}
                      />
                    </Label>
                  ))}
                </div>
              </fieldset>
            </section>
            <section className="form-section" id="budget">
              <div className="form-section-title">
                <span>03</span>
                <h2>투자 계획</h2>
                <small>투자 가능한 범위를 확인합니다.</small>
              </div>
              <div className="field-grid">
                <div className="field">
                  <Label htmlFor="deposit">
                    보증금 <span className="required">*</span>
                  </Label>
                  <div className="unit-input">
                    <Input
                      id="deposit"
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      placeholder="예: 5,000"
                      value={form.deposit}
                      onChange={(e) => update('deposit', e.target.value)}
                      required
                    />
                    <span>만 원</span>
                  </div>
                </div>
                <div className="field">
                  <Label htmlFor="premium">
                    권리금 <span className="required">*</span>
                  </Label>
                  <div className="unit-input">
                    <Input
                      id="premium"
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      placeholder="권리금이 없으면 0"
                      value={form.premium}
                      onChange={(e) => update('premium', e.target.value)}
                      required
                    />
                    <span>만 원</span>
                  </div>
                </div>
              </div>
              <div className="total-investment">
                <span>보증금 + 권리금</span>
                <strong>
                  {total.toLocaleString('ko-KR')}
                  <small>만 원</small>
                </strong>
              </div>
              <div className="field-grid">
                <div className="field">
                  <Label htmlFor="sale-budget">매매 총예산 (선택)</Label>
                  <div className="unit-input">
                    <Input
                      id="sale-budget"
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      placeholder="매매 검색 시 입력"
                      value={form.saleBudget}
                      onChange={(e) => update('saleBudget', e.target.value)}
                    />
                    <span>만 원</span>
                  </div>
                </div>
                <div className="field">
                  <Label htmlFor="monthly-rent-max">월세 상한 (선택)</Label>
                  <div className="unit-input">
                    <Input
                      id="monthly-rent-max"
                      type="number"
                      min="0"
                      max="10000000"
                      step="1"
                      placeholder="임대 검색 시 입력"
                      value={form.monthlyRentMax}
                      onChange={(e) => update('monthlyRentMax', e.target.value)}
                    />
                    <span>만 원</span>
                  </div>
                </div>
              </div>
              <p className="field-help">
                매매 총예산이 없으면 매매, 월세 상한이 없으면 임대 결과를
                제외합니다. 보증금·권리금을 매매 예산으로 계산하지 않습니다.
              </p>
              <fieldset>
                <legend>
                  투자금 형태 <span className="required">*</span>
                </legend>
                <RadioGroup
                  className="choice-options"
                  value={form.funding}
                  onValueChange={(v) => update('funding', v)}
                  aria-label="투자금 형태"
                >
                  {['현금', '현금+대출', '현금+대출+리스'].map((name) => (
                    <Label
                      className={`choice-option ${form.funding === name ? 'selected' : ''}`}
                      key={name}
                    >
                      <RadioGroupItem value={name} />
                      <span>{name.replaceAll('+', ' + ')}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>
            </section>
            <section className="form-section" id="operation">
              <div className="form-section-title">
                <span>04</span>
                <h2>운영 계획</h2>
                <small>예상하시는 매장 운영 방식을 선택해 주세요.</small>
              </div>
              <fieldset>
                <legend className="sr-only">운영 형태</legend>
                <RadioGroup
                  className="choice-options operation-options"
                  value={form.operation}
                  onValueChange={(v) => update('operation', v)}
                  aria-label="운영 형태"
                >
                  {[
                    { name: '오토', desc: '직원 중심의 매장 운영' },
                    { name: '점주+알바', desc: '점주와 직원이 함께 운영' },
                    { name: '점주', desc: '점주가 직접 운영' },
                  ].map(({ name, desc }) => (
                    <Label
                      className={`choice-option ${form.operation === name ? 'selected' : ''}`}
                      key={name}
                    >
                      <RadioGroupItem value={name} />
                      <span>
                        {name.replaceAll('+', ' + ')}
                        <small>{desc}</small>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </fieldset>
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <p>
                <ShieldCheck size={15} /> 서버로 보내지 않습니다. 확인 화면에서
                파일로 내려받으십시오.
              </p>
              <Button type="submit" className="submit-button">
                상담 내용 확인 <ArrowRight size={17} />
              </Button>
            </div>
          </form>
        </main>
        <aside className="summary-sidebar">
          <div className="summary-card">
            <span className="eyebrow">CONSULTATION SUMMARY</span>
            <h3>상담 조건 한눈에</h3>
            <div className="completion-count">
              <span>입력 완료</span>
              <b>
                {progress}
                <small> / 4</small>
              </b>
            </div>
            <div className="completion-bar">
              <span style={{ width: `${progress * 25}%` }} />
            </div>
            <dl>
              <dt>고객명</dt>
              <dd>{form.name || '아직 입력하지 않았어요'}</dd>
              <dt>1순위 희망 지역</dt>
              <dd>
                {form.areas[0].district
                  ? 지역(form.areas[0])
                  : '지역을 선택해 주세요'}
              </dd>
              <dt>희망 면적 · 상권</dt>
              <dd>
                {form.size ? `${form.size}평` : '면적 미입력'}
                <span className="summary-dot">·</span>
                {form.market.length ? form.market.join(' · ') : '상권 미선택'}
              </dd>
              <dt>투자금 합계</dt>
              <dd className="summary-money">
                {total.toLocaleString('ko-KR')} <small>만 원</small>
              </dd>
              <dt>운영 형태</dt>
              <dd>{form.operation || '운영 형태 미선택'}</dd>
            </dl>
            <div className="summary-bottom">
              <ClipboardCheck size={16} /> 모든 조건을 확인한 후<br />
              상담 파일로 내려받으세요.
            </div>
          </div>
          <p className="data-disclaimer">
            매물 조회와 유동인구는 아직 연결되지 않았습니다.
            <br />
            유동인구는 별도 데이터 연결이 필요합니다.
          </p>
        </aside>
      </div>
      <Dialog
        open={Boolean(addressTarget)}
        onOpenChange={(open) => {
          if (!open) setAddressTarget(null);
        }}
      >
        <DialogContent className="postcode-dialog">
          <DialogTitle>
            근무지 주소 검색
          </DialogTitle>
          <DialogDescription>
            도로명, 건물명 또는 지번으로 검색해 주세요.
          </DialogDescription>
          {addressError ? <p className="form-error">{addressError}</p> : null}
          <div ref={postcodeRef} className="postcode-frame" />
          <p className="field-help">주소 검색 서비스: Kakao (Daum) 우편번호</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
