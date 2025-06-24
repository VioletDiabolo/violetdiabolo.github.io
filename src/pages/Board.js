import React, { useState } from 'react'
import { BoardList } from '../helpers/BoardList'
import BoardItem from '../components/BoardItem'
import "../styles/Board.css"

function Board() {
  const semesters = Object.keys(BoardList)
  const [selectedSemester, setSelectedSemester] = useState(semesters[0])
  return (
    <div className='board'>
      <div className='boardContent'>
        <h1 className='boardTitle'>Board</h1>
        <select 
          className='semesterDropdown'
          value={selectedSemester} 
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          {semesters.map((semester, index) => (
            <option key={index} value={semester}>{semester}</option>
          ))}
        </select>
        <div className='boardList'>
            {BoardList[selectedSemester].map((boardItem, key) => {
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