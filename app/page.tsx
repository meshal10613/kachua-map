import KachuaMap from "./KachuaMap";


export default function Home() {
    return (
        <main style={{ padding: "2rem" }}>
            <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
                Kachua Upazila Union Map (12 Unions)
            </h1>

            <KachuaMap />

            <div
                style={{
                    marginTop: "20px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                }}
            >
                <p>
                    <strong>Unions:</strong> Ashrafpur, Bitara, Gohat (N/S),
                    Kachua (N/S), Kadla, Karaiya, Palakhal, Sahadebpur (E/W),
                    Sachar.
                </p>
            </div>
        </main>
    );
}
