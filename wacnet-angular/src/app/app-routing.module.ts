import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DefaultContainerComponent } from './containers/default-container/default-container.component';
import { HomeComponent } from './views/home/home.component';
import { GraphComponent } from './views/graph/graph.component';

const routes: Routes = [
  {
    path: '',
    component: DefaultContainerComponent,
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'graph/:siteId',
        component: GraphComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
