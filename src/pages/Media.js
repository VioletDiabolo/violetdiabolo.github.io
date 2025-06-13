import React from 'react'
import { MediaList } from '../helpers/MediaList'
import MediaItem from '../components/MediaItem'
import "../styles/Media.css";

function Media() {
  return (
    <div className='media'>
      <div className='mediaContent'>
        <h1 className='mediaTitle'>Media</h1>
        <div className='mediaList'>
            {MediaList.map((mediaItem, key) => {
            return (
                <MediaItem
                key={key}
                name={mediaItem.name}
                link={mediaItem.link}
                />
            );
            })}
        </div>
      </div>
    </div>
  )
}

export default Media 