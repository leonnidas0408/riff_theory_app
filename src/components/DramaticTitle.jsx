import React from "react";

export default function DramaticTitle({ title }) {
    let split = title.split(" ");
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "5%"
        }}>
            {
                split.map((item, index) => (
                     <h1 key={index} className={index % 2 == 0 ? "primary" : "secondary"}>{item}</h1>
                ))
            }
        </div>
    )
}