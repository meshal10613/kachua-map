"use client";

import { MapContainer, TileLayer, GeoJSON, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useMemo } from "react";

// --- 1. DATA & LOGIC ---

const voterData = {
    Sachar: { total: 3500, a: 1500, b: 1200, c: 800 },
    Bitara: { total: 2800, a: 800, b: 1900, c: 100 },
    "Paschim Sahadebpur": { total: 2100, a: 1000, b: 1000, c: 100 },
    "Purba Sahadebpur": { total: 1800, a: 900, b: 600, c: 300 },
    "Kachua North": { total: 3200, a: 2000, b: 500, c: 700 },
    "Kachua South": { total: 2900, a: 400, b: 2000, c: 500 },
    Kadla: { total: 2500, a: 1200, b: 1000, c: 300 },
    "Palakhal Model": { total: 2200, a: 200, b: 500, c: 1500 },
    Karaiya: { total: 3000, a: 1500, b: 1400, c: 100 },
    "Gohat North": { total: 2600, a: 1300, b: 1300, c: 0 },
    "Gohat South": { total: 2400, a: 1800, b: 400, c: 200 },
    Ashrafpur: { total: 3100, a: 2500, b: 500, c: 100 },
};

// --- 2. GEOMETRY ENGINE (High-Detail, Zero-Gap) ---
const NODES = {
    TOP_TIP: [23.46, 90.9],
    SACHAR_L: [23.43, 90.86],
    SACHAR_R: [23.43, 90.94],
    BITARA_L: [23.41, 90.86],
    BITARA_R: [23.41, 90.95],
    BITARA_CENTER_B: [23.4, 90.9],
    PASCHIM_L: [23.38, 90.83],
    PASCHIM_CENTER_B: [23.38, 90.89],
    PURBA_R: [23.39, 90.93],
    KADLA_L: [23.36, 90.81],
    KADLA_B: [23.35, 90.86],
    KACHUA_N_R: [23.38, 90.97],
    KACHUA_CENTER: [23.36, 90.94],
    PALAKHAL_B: [23.32, 90.85],
    KACHUA_S_B: [23.33, 90.9],
    KARAIYA_R: [23.33, 90.95],
    GOHAT_N_TOP: [23.33, 90.99],
    GOHAT_JUNCTION: [23.3, 90.95],
    GOHAT_S_R: [23.28, 90.99],
    ASHRAFPUR_TIP: [23.21, 91.01],
    ASHRAFPUR_L: [23.25, 90.92],
};

const getEdge = (startNode, endNode, complexity = 12) => {
    const [lat1, lng1] = startNode;
    const [lat2, lng2] = endNode;
    const points = [[lng1, lat1]];
    for (let i = 1; i < complexity; i++) {
        const t = i / complexity;
        let lat = lat1 + (lat2 - lat1) * t;
        let lng = lng1 + (lng2 - lng1) * t;
        const noiseLat = Math.sin(lat * 1000 + lng * 500) * 0.003;
        const noiseLng = Math.cos(lat * 800 - lng * 1200) * 0.003;
        points.push([lng + noiseLng, lat + noiseLat]);
    }
    points.push([lng2, lat2]);
    return points;
};

const rev = (points) => [...points].reverse();
const EDGES = {
    SACHAR_W: getEdge(NODES.SACHAR_L, NODES.TOP_TIP, 18),
    SACHAR_E: getEdge(NODES.TOP_TIP, NODES.SACHAR_R, 18),
    SACHAR_BITARA: getEdge(NODES.SACHAR_R, NODES.SACHAR_L, 20),
    BITARA_W: getEdge(NODES.BITARA_L, NODES.SACHAR_L, 12),
    BITARA_E: getEdge(NODES.SACHAR_R, NODES.BITARA_R, 12),
    BITARA_PASCHIM: getEdge(NODES.BITARA_L, NODES.BITARA_CENTER_B, 15),
    BITARA_PURBA: getEdge(NODES.BITARA_CENTER_B, NODES.BITARA_R, 15),
    PASCHIM_W: getEdge(NODES.PASCHIM_L, NODES.BITARA_L, 15),
    PASCHIM_E: getEdge(NODES.BITARA_CENTER_B, NODES.PASCHIM_CENTER_B, 12),
    PURBA_E: getEdge(NODES.BITARA_R, NODES.PURBA_R, 10),
    PURBA_KACHUAN: getEdge(NODES.PURBA_R, NODES.PASCHIM_CENTER_B, 12),
    PASCHIM_KADLA: getEdge(NODES.PASCHIM_L, NODES.PASCHIM_CENTER_B, 15),
    KADLA_W: getEdge(NODES.KADLA_B, NODES.KADLA_L, 15),
    KADLA_PASCHIM_L_LINK: getEdge(NODES.KADLA_L, NODES.PASCHIM_L, 8),
    KADLA_KACHUAS: getEdge(NODES.PASCHIM_CENTER_B, NODES.KADLA_B, 12),
    KACHUAN_TOP: getEdge(NODES.KACHUA_N_R, NODES.PURBA_R, 12),
    KACHUAN_E: getEdge(NODES.KACHUA_N_R, NODES.KACHUA_CENTER, 15),
    KACHUAN_KACHUAS: getEdge(NODES.KACHUA_CENTER, NODES.PASCHIM_CENTER_B, 15),
    KACHUAS_W: getEdge(NODES.KADLA_B, NODES.KACHUA_S_B, 12),
    KACHUAS_E: getEdge(NODES.KACHUA_S_B, NODES.KACHUA_CENTER, 12),
    PALAKHAL_W: getEdge(NODES.PALAKHAL_B, NODES.KADLA_B, 15),
    PALAKHAL_S: getEdge(NODES.KACHUA_S_B, NODES.PALAKHAL_B, 15),
    KARAIYA_E: getEdge(NODES.KACHUA_CENTER, NODES.KARAIYA_R, 15),
    KARAIYA_GOHAT: getEdge(NODES.KARAIYA_R, NODES.GOHAT_JUNCTION, 15),
    KARAIYA_S: getEdge(NODES.GOHAT_JUNCTION, NODES.KACHUA_S_B, 15),
    GOHATN_W: getEdge(NODES.KARAIYA_R, NODES.GOHAT_N_TOP, 15),
    GOHATN_E: getEdge(NODES.GOHAT_N_TOP, NODES.GOHAT_JUNCTION, 18),
    GOHATS_W: getEdge(NODES.GOHAT_JUNCTION, NODES.GOHAT_S_R, 15),
    GOHATS_S: getEdge(NODES.GOHAT_S_R, NODES.ASHRAFPUR_L, 18),
    GOHAT_ASH_LINK: getEdge(NODES.ASHRAFPUR_L, NODES.GOHAT_JUNCTION, 10),
    ASH_W: getEdge(NODES.KACHUA_S_B, NODES.ASHRAFPUR_L, 15),
    ASH_S: getEdge(NODES.ASHRAFPUR_L, NODES.ASHRAFPUR_TIP, 20),
    ASH_E: getEdge(NODES.ASHRAFPUR_TIP, NODES.GOHAT_S_R, 25),
};

const GENERATED_FEATURES = [
    {
        name: "Sachar",
        coords: [...EDGES.SACHAR_W, ...EDGES.SACHAR_E, ...EDGES.SACHAR_BITARA],
        center: [23.44, 90.9],
    },
    {
        name: "Bitara",
        coords: [
            ...rev(EDGES.SACHAR_BITARA),
            ...rev(EDGES.BITARA_E),
            ...rev(EDGES.BITARA_PURBA),
            ...rev(EDGES.BITARA_PASCHIM),
            ...EDGES.BITARA_W,
        ],
        center: [23.42, 90.9],
    },
    {
        name: "Paschim Sahadebpur",
        coords: [
            ...EDGES.PASCHIM_W,
            ...EDGES.BITARA_PASCHIM,
            ...EDGES.PASCHIM_E,
            ...rev(EDGES.PASCHIM_KADLA),
            ...rev(EDGES.KADLA_PASCHIM_L_LINK),
        ],
        center: [23.395, 90.865],
    },
    {
        name: "Purba Sahadebpur",
        coords: [
            ...EDGES.BITARA_PURBA,
            ...EDGES.PURBA_E,
            ...EDGES.PURBA_KACHUAN,
            ...rev(EDGES.PASCHIM_E),
        ],
        center: [23.395, 90.91],
    },
    {
        name: "Kachua North",
        coords: [
            ...rev(EDGES.PURBA_KACHUAN),
            ...rev(EDGES.KACHUAN_TOP),
            ...EDGES.KACHUAN_E,
            ...EDGES.KACHUAN_KACHUAS,
        ],
        center: [23.38, 90.95],
    },
    {
        name: "Kadla",
        coords: [
            ...EDGES.PASCHIM_KADLA,
            ...EDGES.KADLA_KACHUAS,
            ...EDGES.KADLA_W,
            ...EDGES.KADLA_PASCHIM_L_LINK,
        ],
        center: [23.365, 90.84],
    },
    {
        name: "Kachua South",
        coords: [
            ...rev(EDGES.KACHUAN_KACHUAS),
            ...rev(EDGES.KACHUAS_E),
            ...rev(EDGES.KACHUAS_W),
            ...rev(EDGES.KADLA_KACHUAS),
        ],
        center: [23.36, 90.91],
    },
    {
        name: "Palakhal Model",
        coords: [
            ...EDGES.KACHUAS_W,
            ...rev(EDGES.PALAKHAL_S),
            ...EDGES.PALAKHAL_W,
            ...rev(EDGES.KADLA_W),
        ],
        center: [23.33, 90.86],
    },
    {
        name: "Karaiya",
        coords: [
            ...EDGES.KACHUAS_E,
            ...EDGES.KARAIYA_E,
            ...EDGES.KARAIYA_GOHAT,
            ...EDGES.KARAIYA_S,
        ],
        center: [23.33, 90.92],
    },
    {
        name: "Gohat North",
        coords: [
            ...rev(EDGES.KARAIYA_GOHAT),
            ...rev(EDGES.GOHATN_W),
            ...EDGES.GOHATN_E,
        ],
        center: [23.315, 90.97],
    },
    {
        name: "Gohat South",
        coords: [
            ...rev(EDGES.GOHATN_E),
            ...rev(EDGES.GOHAT_ASH_LINK),
            ...EDGES.GOHATS_S,
            ...rev(EDGES.GOHATS_W),
        ],
        center: [23.29, 90.96],
    },
    {
        name: "Ashrafpur",
        coords: [
            ...EDGES.ASH_W,
            ...EDGES.ASH_S,
            ...EDGES.ASH_E,
            ...rev(EDGES.GOHATS_S),
            ...EDGES.GOHAT_ASH_LINK,
            ...rev(EDGES.KARAIYA_S),
            ...EDGES.PALAKHAL_S,
        ],
        center: [23.25, 90.96],
    },
];

const createTextLabelIcon = (name) => {
    return new L.DivIcon({
        html: `<div style="font-family:'Segoe UI',sans-serif; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; text-shadow:1px 1px 0 #fff;">${name}</div>`,
        className: "text-label-icon",
        iconSize: [120, 20],
        iconAnchor: [60, 10],
    });
};

const KachuaMap = () => {
    const [activeUnion, setActiveUnion] = useState(null);

    const geoJsonData = useMemo(() => {
        return {
            type: "FeatureCollection",
            features: GENERATED_FEATURES.map((f) => ({
                type: "Feature",
                properties: { name: f.name, center: f.center },
                geometry: { type: "Polygon", coordinates: [f.coords] },
            })),
        };
    }, []);

    const activeData = activeUnion ? voterData[activeUnion] : null;

    // Calculate winner if active
    let winner = null;
    let maxVotes = 0;
    if (activeData) {
        if (activeData.a > maxVotes) {
            maxVotes = activeData.a;
            winner = "Candidate A";
        }
        if (activeData.b > maxVotes) {
            maxVotes = activeData.b;
            winner = "Candidate B";
        }
        if (activeData.c > maxVotes) {
            maxVotes = activeData.c;
            winner = "Candidate C";
        }
    }

    // Styles
    const defaultStyle = {
        fillColor: "#fff",
        weight: 1.5,
        opacity: 1,
        color: "#6b7280",
        dashArray: "6, 6",
        fillOpacity: 0.3,
        lineJoin: "round",
    };
    const hoverStyle = {
        fillColor: "#facc15",
        weight: 3,
        opacity: 1,
        color: "#111827",
        dashArray: "",
        fillOpacity: 0.6,
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 font-sans">
            {/* HEADER */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
                        KACHUA UPAZILA
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Real-time Election Analytics Dashboard
                    </p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                        Live Data
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                        12 Unions
                    </span>
                </div>
            </div>

            {/* DASHBOARD GRID */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* LEFT COLUMN: MAP */}
                <div className="w-full lg:w-2/3 h-125 lg:h-175 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
                    <MapContainer
                        center={[23.34, 90.92]}
                        zoom={11.4}
                        style={{
                            height: "100%",
                            width: "100%",
                            background: "#f3f4f6",
                        }}
                        scrollWheelZoom={false}
                    >
                        {/* Clean Map Tiles */}
                        <TileLayer
                            attribution=""
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"
                        />

                        <GeoJSON
                            data={geoJsonData}
                            style={(feature) =>
                                activeUnion === feature.properties.name
                                    ? hoverStyle
                                    : defaultStyle
                            }
                            onEachFeature={(feature, layer) => {
                                layer.on({
                                    mouseover: () =>
                                        setActiveUnion(feature.properties.name),
                                    // We don't clear on mouseout immediately so the data stays while reading
                                    click: () =>
                                        setActiveUnion(feature.properties.name),
                                });
                            }}
                        />

                        {geoJsonData.features.map((feature, idx) => (
                            <Marker
                                key={idx}
                                position={feature.properties.center}
                                icon={createTextLabelIcon(
                                    feature.properties.name,
                                )}
                                interactive={false}
                            />
                        ))}
                    </MapContainer>

                    {/* Mobile Overlay Hint */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-xs font-medium text-gray-500 shadow-sm border border-gray-200 pointer-events-none z-100">
                        👆 Hover or tap a region
                    </div>
                </div>

                {/* RIGHT COLUMN: INFORMATION PANEL */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    {/* Card 1: Status / Selection */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex-1 transition-all duration-300">
                        {!activeUnion ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 opacity-60">
                                <svg
                                    className="w-16 h-16 mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"
                                    ></path>
                                </svg>
                                <p className="text-lg font-medium">
                                    Select a Union
                                </p>
                                <p className="text-sm">
                                    Hover over the map to view election results.
                                </p>
                            </div>
                        ) : (
                            <div className="animate-fadeIn">
                                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                                            {activeUnion}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Union Council
                                        </p>
                                    </div>
                                    {/* Winner Badge */}
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                                            Leading
                                        </div>
                                        <div className="text-sm font-bold text-indigo-600">
                                            {winner}
                                        </div>
                                    </div>
                                </div>

                                {/* Total Votes */}
                                <div className="mb-6 bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">
                                        Total Cast Votes
                                    </span>
                                    <span className="text-2xl font-black text-gray-800">
                                        {activeData.total.toLocaleString()}
                                    </span>
                                </div>

                                {/* Candidates List */}
                                <div className="space-y-5">
                                    {/* Cand A */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-gray-700">
                                                Candidate A
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                {activeData.a}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(activeData.a / activeData.total) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Cand B */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-gray-700">
                                                Candidate B
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                {activeData.b}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(activeData.b / activeData.total) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Cand C */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-gray-700">
                                                Candidate C
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                {activeData.c}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(activeData.c / activeData.total) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Legend Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                            Legend
                        </h3>
                        <div className="flex gap-4 text-xs font-medium text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                                Cand A
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                Cand B
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                Cand C
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .text-label-icon {
                    background: transparent;
                    border: none;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default KachuaMap;
