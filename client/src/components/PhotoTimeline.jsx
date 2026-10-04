import { useEffect, useId, useRef, useState } from "react";
import { groupPhotos, photoDate } from "./photoTimeline.js";
import "./PhotoTimeline.css";

function PhotoImage({ photo, title, expanded = false }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="timeline-image-missing">Photo unavailable</div>;
  return (
    <img
      src={`/api/uploads/${encodeURIComponent(photo.file_path)}`}
      alt={title}
      loading={expanded ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}

function PhotoMetadata({ photo, date }) {
  const hasLocation = photo.latitude != null && photo.latitude !== ""
    && photo.longitude != null && photo.longitude !== "";
  return (
    <div className="timeline-metadata">
      {date ? (
        <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, {
          month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
        })}</time>
      ) : <span>Time unavailable</span>}
      {hasLocation && <span>GPS: {photo.latitude}, {photo.longitude}</span>}
    </div>
  );
}

export default function PhotoTimeline({ photos, tasks }) {
  const [order, setOrder] = useState("newest");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const dialogRef = useRef(null);
  const headingId = useId();
  const viewerId = useId();
  const taskNames = new Map(tasks.map((task) => [task.id, task.title]));
  const titleFor = (photo) => taskNames.get(photo.task_id) || "Job photo";
  const groups = groupPhotos(photos, order);

  useEffect(() => {
    if (selectedPhoto && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selectedPhoto]);

  return (
    <section className="photo-timeline" aria-labelledby={headingId}>
      <div className="timeline-header">
        <div>
          <h2 id={headingId}>Job photo timeline <span className="timeline-count">{photos.length}</span></h2>
          <p>All photos for this work order, organized by date.</p>
        </div>
        {photos.length > 1 && (
          <label className="timeline-sort">
            Sort photos
            <select value={order} onChange={(event) => setOrder(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="timeline-empty">
          <span aria-hidden="true">▧</span>
          <h3>No job photos yet</h3>
          <p>Photos added to this work order’s tasks will appear here.</p>
        </div>
      ) : (
        <ol className="timeline-days">
          {groups.map((group) => (
            <li key={group.key} className="timeline-day">
              <div className="timeline-day-heading">
                <h3>{group.label}</h3>
                <span>{group.entries.length} {group.entries.length === 1 ? "photo" : "photos"}</span>
              </div>
              <div className="timeline-grid">
                {group.entries.map(({ photo, date }) => (
                  <article className="timeline-card" key={photo.id} data-photo-id={photo.id}>
                    <button
                      type="button"
                      className="timeline-photo-button"
                      onClick={() => setSelectedPhoto(photo)}
                      aria-label={`View photo: ${titleFor(photo)}${date ? `, ${date.toLocaleString()}` : ""}`}
                      aria-haspopup="dialog"
                    >
                      <PhotoImage photo={photo} title={titleFor(photo)} />
                      <span className="timeline-open-hint" aria-hidden="true">View photo ↗</span>
                    </button>
                    <div className="timeline-card-info">
                      <h4>{titleFor(photo)}</h4>
                      <PhotoMetadata photo={photo} date={date} />
                    </div>
                  </article>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      <dialog ref={dialogRef} className="timeline-viewer" aria-labelledby={viewerId} onClose={() => setSelectedPhoto(null)}>
        {selectedPhoto && (
          <>
            <div className="timeline-viewer-header">
              <h2 id={viewerId}>{titleFor(selectedPhoto)}</h2>
              <button type="button" className="btn-secondary" autoFocus onClick={() => dialogRef.current.close()}>Close photo</button>
            </div>
            <div className="timeline-viewer-image">
              <PhotoImage key={selectedPhoto.id} photo={selectedPhoto} title={titleFor(selectedPhoto)} expanded />
            </div>
            <PhotoMetadata photo={selectedPhoto} date={photoDate(selectedPhoto.captured_at)} />
          </>
        )}
      </dialog>
    </section>
  );
}
