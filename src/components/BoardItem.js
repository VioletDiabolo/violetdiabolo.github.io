import React from 'react'

function BoardItem({ image, name, position, description }) {
  return (
    <div className='boardItem'>
        <div className='boardImage'>
            <img src={image} alt={name} />
        </div>
        <div className='boardText'>
            <h2 title={name}>{name}</h2>
            <h3 title={position}>{position}</h3>
            <p title={description}>{description}</p>
        </div>
    </div>
  )
}

export default BoardItem