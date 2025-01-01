import React from 'react'
import InstagramIcon from '@mui/icons-material/Instagram';
import YoutubeIcon from '@mui/icons-material/YouTube';
import GithubIcon from '@mui/icons-material/GitHub';
import '../styles/Footer.css';

function Footer() {
  return (
    <div className='footer'>
        <div className='socialMedia'>
            <a href='https://instagram.com/violet_diabolo' target='_blank' rel='noreferrer'><InstagramIcon /></a> <a href='https://www.youtube.com/@violetdiabolo2213' target='_blank' rel='noreferrer'><YoutubeIcon /></a>
        </div>
        <div className='github'>
            <a href='https://github.com/VioletDiabolo/violetdiabolo.github.io' target='_blank' rel='noreferrer'><GithubIcon /></a>
        </div>
        <div className='created-by'>
            Created by Aaron Hui
        </div>
    </div>
  )
}

export default Footer