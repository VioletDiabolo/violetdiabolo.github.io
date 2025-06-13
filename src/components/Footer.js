import React from 'react'
import InstagramIcon from '@mui/icons-material/Instagram';
import YoutubeIcon from '@mui/icons-material/YouTube';
import GithubIcon from '@mui/icons-material/GitHub';
import { ReactComponent as EngageIcon } from '../assets/engage.svg';
import '../styles/Footer.css';

function Footer() {
  return (
    <div className='footer'>
        <div className='socialMedia'>
            <a href='https://instagram.com/violet_diabolo' target='_blank' rel='noreferrer'><InstagramIcon /></a>
            <a href='https://www.youtube.com/@violetdiabolo2213' target='_blank' rel='noreferrer'><YoutubeIcon /></a>
            <a href='https://engage.nyu.edu/organization/violet-diabolo-all-university' target='_blank' rel='noreferrer'><EngageIcon /></a>
        </div>
        <div className='github'>
            <a href='https://github.com/VioletDiabolo/violetdiabolo.github.io' target='_blank' rel='noreferrer'><GithubIcon /></a>
        </div>
        <div className='violet-diabolo'>
            VIOLET DIABOLO 2025
        </div>
    </div>
  )
}

export default Footer