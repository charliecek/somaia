<?php
die();
// $f= "file_list2"; if (file_exists(__DIR__.'/'.$f.'.txt')) unlink(__DIR__.'/'.$f.'.txt');
// if (file_exists(__DIR__.'/tab2_1490634586930.txt')) unlink(__DIR__.'/tab2_1490634586930.txt');
$aArray = scandir(__DIR__);
echo "<pre>";
var_dump($aArray);