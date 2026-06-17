export interface TicketParkGuideData {
  title: string;
  imageSrc: string;
  sections: string[];
}

export const parkGuideData: TicketParkGuideData = {
  title: '乐园导览',
  imageSrc: '',
  sections: ['吃', '住', '行', '游', '购', '娱', '商', '学', '情'],
};
