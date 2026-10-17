@echo off
title आवाज - The 24-Hour Business and Tech Chronicle
echo ========================================================
echo   आवाज (Aawaaz) - 24-Hour Broadsheet Newspaper
echo   Starting web application server on port 5000...
echo ========================================================

python -m pip install -r requirements.txt
python app.py

pause
