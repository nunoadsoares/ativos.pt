// packages/webapp/src/components/DefaultRiskMap.tsx
import React, { useRef, useEffect, useState, useMemo, type CSSProperties, type FC } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const MAP_FILE = '/maps/portugal-nuts2.json';

const REGION_API_TO_MAP_NAME: Record<string, string> = {
  "Norte (NUTS II)": "Norte", "Douro (NUTS III)": "Norte", "Tâmega e Sousa (NUTS III)": "Norte", "Terras de Trás-os-Montes (NUTS III)": "Norte",
  "Centro (NUTS II)": "Centro",
  "Área Metropolitana de Lisboa (NUTS II)": "Lisboa", "Grande Lisboa (NUTS II)": "Lisboa", "Grande Lisboa (NUTS III)": "Lisboa", "Península de Setúbal (NUTS II)": "Lisboa",
  "Alentejo (NUTS II)": "Alentejo", "Lezíria do Tejo (NUTS III)": "Alentejo",
  "Algarve (NUTS II)": "Algarve",
};

// Tipos de dados
interface Indicator { value: number; label: string; };
interface ApiResponse { ok: boolean; data: Record<string, Indicator | null> };
type RegionData = { value: number | null; type: string };
type TooltipData = { regionName: string; subRegions: { name: string; data: RegionData }[] };

const MapPlaceholder: FC<{ message: string }> = ({ message }) => (
    <div className="flex h-96 items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const DefaultRiskMap: FC = () => {
    // Estado para garantir que o mapa só é renderizado no cliente (browser)
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [data, setData] = useState<Record<string, RegionData>>({});
    const [tooltip, setTooltip] = useState<{ content: TooltipData | null; x: number; y: number }>({ content: null, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/data/defaultRiskMapData')
            .then(res => res.json())
            .then((response: ApiResponse) => {
                const apiData = response.data;
                const formattedData: Record<string, RegionData> = {};
                for (const regionName in apiData) {
                    const indicator = apiData[regionName];
                    formattedData[regionName] = {
                        value: indicator?.value ?? null,
                        type: 'Habitação'
                    };
                }
                setData(formattedData);
            })
            .catch(console.error);
    }, []);

    const groupedDataByMapName = useMemo(() => {
        const groups: Record<string, { name: string; data: RegionData }[]> = { Norte: [], Centro: [], Lisboa: [], Alentejo: [], Algarve: [] };
        for (const [apiRegion, regionData] of Object.entries(data)) {
            const mapName = REGION_API_TO_MAP_NAME[apiRegion];
            if (mapName) {
                const cleanName = apiRegion.replace(/\s*\(NUTS [II|III]+\)$/, '');
                if (!groups[mapName].some(item => item.name === cleanName)) {
                    groups[mapName].push({ name: cleanName, data: regionData });
                }
            }
        }
        return groups;
    }, [data]);

    function getTooltipStyle(): CSSProperties {
        if (!containerRef.current || !tooltip.content) return { display: "none" };
        const rect = containerRef.current.getBoundingClientRect();
        let left = tooltip.x + 24;
        if (left + 220 > rect.width) {
            left = tooltip.x - 220 - 24;
        }
        return { left, top: tooltip.y, position: "absolute", zIndex: 20, pointerEvents: "none" };
    }

    // Se ainda não estivermos no cliente, ou se os dados não carregaram, mostra um placeholder.
    if (!isClient || Object.keys(data).length === 0) {
        return <MapPlaceholder message="A carregar mapa de risco..." />;
    }

    return (
        <div ref={containerRef} className="relative border border-gray-200 dark:border-gray-700 rounded-lg">
            <ComposableMap projection="geoMercator" projectionConfig={{ center: [-8.5, 40], scale: 5000 }} style={{ width: '100%', height: 'auto' }}>
                <ZoomableGroup center={[-8.2, 39.7]} zoom={0.9}>
                    <Geographies geography={MAP_FILE}>
                        {({ geographies }) =>
                            geographies.map(geo => {
                                const mapRegionName = geo.properties.name as string;
                                const subRegions = groupedDataByMapName[mapRegionName] || [];
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onMouseEnter={e => {
                                            if (containerRef.current) {
                                                const rect = containerRef.current.getBoundingClientRect();
                                                setTooltip({ content: { regionName: mapRegionName, subRegions }, x: e.clientX - rect.left, y: e.clientY - rect.top });
                                            }
                                        }}
                                        onMouseMove={e => {
                                            if (containerRef.current) {
                                                const rect = containerRef.current.getBoundingClientRect();
                                                setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
                                            }
                                        }}
                                        onMouseLeave={() => setTooltip({ content: null, x: 0, y: 0 })}
                                        style={{
                                            default: { fill: '#047857', stroke: '#FFF', strokeWidth: 0.7, outline: 'none', transition: 'fill 0.3s' },
                                            hover: { fill: '#059669', outline: 'none' },
                                            pressed: { fill: '#065f46', outline: 'none' }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>
            {tooltip.content && (
                <div className="p-3 text-sm bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl opacity-95 w-64 whitespace-normal overflow-auto font-sans" style={getTooltipStyle()}>
                    <strong className="block mb-2 pb-1 border-b border-gray-600 font-bold">{tooltip.content.regionName}</strong>
                    
                    {/* --- INÍCIO DA CORREÇÃO --- */}
                    {/* Filtramos as sub-regiões para mostrar apenas aquelas com um valor válido. */}
                    {tooltip.content.subRegions.filter(sr => sr.data.value !== null).length > 0 ? (
                        <table className="table-auto w-full mt-2">
                            <tbody>
                                {tooltip.content.subRegions
                                    .filter(sr => sr.data.value !== null) // O filtro acontece aqui
                                    .map(sr => (
                                        <tr key={sr.name}>
                                            <td className="py-0.5 pr-2 text-gray-300 text-left align-top">{sr.name}:</td>
                                            <td className="py-0.5 font-bold text-white text-right align-top">
                                                {`${sr.data.value}%`}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    ) : ( <p className="text-xs text-gray-400 mt-1">Sem dados detalhados disponíveis.</p> )}
                    {/* --- FIM DA CORREÇÃO --- */}

                </div>
            )}
        </div>
    );
};

export default DefaultRiskMap;