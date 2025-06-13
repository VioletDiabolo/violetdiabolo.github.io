import React from "react";

function MediaItem({ name, link }) {
  return (
    <div className="mediaItem">
      <div className="mediaTitleWrapper">
        <h2 title={name}>{name}</h2>
      </div>
      <div className="mediaImage">
        <div className="videoEmbed">
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${link}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default MediaItem;