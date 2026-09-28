import IconButton from "./IconButton";
import DramaticTitle from "./DramaticTitle";

export default function SidebarPages({
    page,
    setPage,
    pageData,
    defaultPage,
}) {
    return (
        <div>
            <div className="sidebar">
                <div className="sidebar-logo">
                    <DramaticTitle title="Riff Theory" />
                </div>

                {Object.entries(pageData).map(
                    ([key, item]) => (
                        <IconButton
                            key={key}
                            onClick={() => setPage(key)}
                            label={key}
                            icon={item.icon}
                            selected={page === key}
                        />
                    )
                )}
            </div>

            <div
                style={{
                    marginLeft: "220px",
                }}
            >
                {pageData[page].page}
            </div>
        </div>
    );
}
