<?php
die();
if (isset($_POST['action'])) {
  if ($_POST['action'] === 'save') {
    $data = $_POST['json_string'];
    //set mode of file to writable.
    $path = __DIR__.'/'.$_POST['file_name'].'.txt';
    chmod($path,0777);
    $f = fopen($path, "w+") or die("fopen failed");
    fwrite($f, $data);
    fclose($f);
  } elseif ($_POST['action'] === 'dirlisting') {
    $aListing = scandir(__DIR__);
    $aOut = array();
    foreach ($aListing as $val) {
      if (preg_match('/^tab\d+_\d+\.txt$/', $val)) {
        $aOut[] = str_replace(".txt", "", $val);
      }
    }
    echo json_encode($aOut);
  }
}