'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadKakaoMap, type KakaoMaps } from '@/lib/kakao-map';
import { PropertyMap, type MapPoint } from '@/components/property-map';

const BRANDS = [
  { name: '컴포즈커피', query: '컴포즈커피' },
  { name: '메가MGC커피', query: '메가MGC커피' },
  { name: '더벤티', query: '더벤티' },
  { name: '하이오커피', query: '하이오커피' },
  { name: '텐퍼센트커피', query: '텐퍼센트커피' },
];

type Place = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};
type Highlight = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  radiusMeters?: number;
  circleColor?: string;
};

function search(places: InstanceType<NonNullable<KakaoMaps['services']>['Places']>, keyword: string) {
  return new Promise<Place[]>((resolve) => {
    places.keywordSearch(keyword, (data, status) => {
      resolve(status === 'OK' ? data : []);
    }, { size: 15 });
  });
}

export function BrandLocationMap({ region, highlight }: { region: string; highlight?: Highlight }) {
  const [brand, setBrand] = useState('전체');
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('지역을 기준으로 카카오맵에서 지점 위치를 찾습니다.');
  const [reload, setReload] = useState(0);
  const searchRegion = useMemo(() => region.trim(), [region]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(searchRegion ? `${searchRegion} 지점 위치를 불러오는 중입니다.` : '희망 지역을 먼저 입력하면 지점 위치가 표시됩니다.');
    if (!searchRegion) { setPoints([]); setLoading(false); return () => { active = false; }; }
    loadKakaoMap().then((K) => {
      const Places = K.services?.Places;
      if (!Places) throw new Error('카카오 장소 검색 서비스를 불러오지 못했습니다.');
      const selected = brand === '전체' ? BRANDS : BRANDS.filter((item) => item.name === brand);
      const places = new Places();
      return Promise.all(selected.map((item) => search(places, `${searchRegion} ${item.query}`))).then((groups) => ({ selected, groups }));
    }).then(({ selected, groups }) => {
      if (!active) return;
      const seen = new Set<string>();
      const next: MapPoint[] = [];
      groups.forEach((items, index) => items.forEach((item) => {
        const id = `${selected[index].name}-${item.id}`;
        const latitude = Number(item.y), longitude = Number(item.x);
        if (seen.has(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        seen.add(id);
        next.push({ id, latitude, longitude, label: `${selected[index].name} · ${item.place_name}`, radiusMeters: 500 });
      }));
      setPoints(next);
      setMessage(next.length ? `${searchRegion}에서 ${next.length}개 지점을 찾았습니다.` : '해당 지역에서 검색된 지점이 없습니다. 지역명을 더 넓게 선택해 보세요.');
    }).catch((error) => {
      if (active) { setPoints([]); setMessage(error instanceof Error ? error.message : '지점 위치를 불러오지 못했습니다.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [brand, reload, searchRegion]);

  return <section className="workspace-card public-brand-map" aria-labelledby="public-brand-map-title">
    <div className="card-title-row">
      <div><span className="eyebrow">BRAND LOCATIONS · KAKAO MAP</span><h2 id="public-brand-map-title">브랜드 지점 위치</h2></div>
      <span className="public-map-badge">매출 정보 제외</span>
    </div>
    <p className="public-map-intro">입력한 1순위 지역의 브랜드 지점 위치만 카카오맵에서 조회합니다. 매출·영수건수·고객정보는 지도에 전달하지 않습니다.</p>
    <div className="brand-map-toolbar" role="group" aria-label="브랜드 선택">
      {['전체', ...BRANDS.map((item) => item.name)].map((name) => <button key={name} type="button" className={brand === name ? 'active' : ''} onClick={() => setBrand(name)}>{name}</button>)}
      <button type="button" className="refresh" onClick={() => setReload((value) => value + 1)}>다시 찾기</button>
    </div>
    <p className="public-map-status" role="status">{loading ? '카카오맵 검색 중입니다…' : message}</p>
    <PropertyMap
      points={highlight ? [...points, highlight] : points}
      mapLabel="브랜드 지점 및 예상매출 카카오맵"
      emptyMessage="검색된 브랜드 지점이 없습니다."
    />
    <p className="map-caption">주황색 원은 각 지점 중심 반경 500m입니다. 카카오 장소 검색 결과는 변동될 수 있으므로 실제 운영 전 현장 확인이 필요합니다.</p>
  </section>;
}
