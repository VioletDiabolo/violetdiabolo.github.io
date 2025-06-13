import React from 'react'
import { BoardList } from '../helpers/BoardList'
import BoardItem from '../components/BoardItem'
import "../styles/Board.css"

function Board() {
  return (
    <div className='media'>
      <div className='boardContent'>
        <h1 className='boardTitle'>Board</h1>
        <div className='boardList'>
            {BoardList.map((boardItem, key) => {
            return (
                <BoardItem
                key={key}
                image={boardItem.image}
                name={boardItem.name}
                position={boardItem.position}
                description={boardItem.description}
                />
            );
            })}
        </div>
      </div>
    </div>
  )
}

export default Board